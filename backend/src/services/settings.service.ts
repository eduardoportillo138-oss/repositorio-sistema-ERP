import mongoose from 'mongoose';
import { SystemSetting } from '../models/systemSetting.model';
import { ValidationError } from '../errors/AppError';
import { Actor } from './user.service';
import { auditedMutation } from './auditedMutation';

const defaults = { locale: 'es-MX', timeZone: 'America/Mexico_City', dateFormat: 'dd/MM/yyyy' } as const;
const descriptions = { locale: 'Idioma de presentación', timeZone: 'Zona horaria de presentación',
  dateFormat: 'Formato de fecha de presentación' } as const;
type SettingKey = keyof typeof defaults;

function parse(body: unknown): Partial<Record<SettingKey, string>> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError('Configuración inválida');
  const raw = body as Record<string, unknown>;
  if (!Object.keys(raw).length || Object.keys(raw).some((key) => !Object.prototype.hasOwnProperty.call(defaults, key)))
    throw new ValidationError('Solo se permiten locale, timeZone y dateFormat');
  const result: Partial<Record<SettingKey, string>> = {};
  for (const key of Object.keys(raw) as SettingKey[]) {
    const value = raw[key];
    if (typeof value !== 'string') throw new ValidationError(`${key} inválido`);
    if (key === 'locale' && !['es-MX', 'en-US'].includes(value)) throw new ValidationError('Idioma no permitido');
    if (key === 'dateFormat' && !['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'].includes(value))
      throw new ValidationError('Formato de fecha no permitido');
    if (key === 'timeZone') {
      if (value.length > 80) throw new ValidationError('Zona horaria no válida');
      try { new Intl.DateTimeFormat('en-US', { timeZone: value }); }
      catch { throw new ValidationError('Zona horaria no válida'); }
    }
    result[key] = value;
  }
  return result;
}

export const settingsService = {
  async get(actor: Actor) {
    const rows = await SystemSetting.find({ companyId: actor.companyId,
      key: { $in: Object.keys(defaults) } }).select('key value').lean().exec();
    const settings: Record<string, string> = { ...defaults };
    for (const row of rows) if (row.key in defaults && typeof row.value === 'string') settings[row.key] = row.value;
    return settings;
  },
  async update(actor: Actor, body: unknown, ip: string, device: string) {
    const values = parse(body);
    const companyId = new mongoose.Types.ObjectId(actor.companyId);
    return auditedMutation(async (session) => {
      const existing = await SystemSetting.find({ companyId, key: { $in: Object.keys(defaults) } })
        .session(session).select('key value').lean().exec();
      const result: Record<string, string> = { ...defaults };
      for (const row of existing) if (typeof row.value === 'string') result[row.key] = row.value;
      for (const [key, value] of Object.entries(values)) {
        await SystemSetting.findOneAndUpdate({ companyId, key }, {
          $set: { value, type: 'string', description: descriptions[key as SettingKey], isSystem: false },
          $setOnInsert: { companyId, key },
        }, { upsert: true, new: true, runValidators: true, session }).exec();
        result[key] = value;
      }
      return result;
    }, (settings) => ({ userId: actor.userId, companyId: actor.companyId, module: 'settings',
      action: 'update', entity: 'company-settings', entityId: actor.companyId,
      newValue: values, ip, device }));
  },
};

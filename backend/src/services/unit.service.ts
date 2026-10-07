import mongoose from 'mongoose';
import { IUnitDocument } from '../models/unit.model';
import { Product } from '../models/product.model';
import { unitRepository } from '../repositories/unit.repository';
import { auditedMutation } from './auditedMutation';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';
import { Actor } from './user.service';

const limits = {
  name: 100,
  code: 20,
  symbol: 10,
  description: 500,
} as const;
type Field = keyof typeof limits;
type UnitInput = Partial<Record<Field, string>>;

function validateFields(body: unknown, creating: boolean): UnitInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de unidad inválidos');
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((key) => !(key in limits)))
    throw new ValidationError('Campos de unidad no permitidos');
  const clean: UnitInput = {};
  for (const key of Object.keys(input) as Field[]) {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length > limits[key])
      throw new ValidationError(`${key} inválido`);
    clean[key] = value.trim();
  }
  if (creating && (!clean.name || !clean.code || !clean.symbol))
    throw new ValidationError('Nombre, código y símbolo obligatorios');
  if (clean.name !== undefined && !clean.name) throw new ValidationError('Nombre inválido');
  if (clean.code !== undefined) {
    clean.code = clean.code.toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(clean.code)) throw new ValidationError('Código inválido');
  }
  if (clean.symbol !== undefined && !clean.symbol)
    throw new ValidationError('Símbolo inválido');
  return clean;
}

function publicUnit(unit: IUnitDocument) {
  return {
    id: String(unit._id),
    name: unit.name,
    code: unit.code,
    symbol: unit.symbol,
    description: unit.description,
    status: unit.status,
    createdAt: unit.createdAt,
    updatedAt: unit.updatedAt,
  };
}

async function checkDuplicates(
  companyId: string,
  fields: UnitInput,
  excludeId?: string,
  session?: mongoose.ClientSession,
) {
  for (const key of ['name', 'code'] as const) {
    const value = fields[key];
    if (value && (await unitRepository.duplicate(companyId, key, value, excludeId, session)))
      throw new ConflictError(`${key} ya existe en la empresa`);
  }
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return {
    userId: actor.userId,
    companyId: actor.companyId,
    module: 'units',
    action,
    entity: 'unit',
    entityId: id,
    oldValue,
    newValue,
    ip,
    device,
  };
}

export const unitService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); }
    catch { throw new ValidationError('Paginación inválida'); }
    const status = query.status;
    if (status !== undefined && status !== 'active' && status !== 'inactive')
      throw new ValidationError('Estado inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100)
      throw new ValidationError('Búsqueda inválida');
    const filter: Record<string, unknown> = {
      status: status || { $in: ['active', 'inactive'] },
    };
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').replaceAll('.', '\\.');
    if (safe) {
      const pattern = new RegExp(safe, 'i');
      filter.$or = [{ name: pattern }, { code: pattern }, { symbol: pattern }];
    }
    const { data, total } = await unitRepository.list(actor.companyId, filter, paging.skip, paging.limit);
    return {
      data: data.map(publicUnit),
      pagination: { page: paging.page, limit: paging.limit, total,
        pages: Math.ceil(total / paging.limit) },
    };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const unit = await unitRepository.get(actor.companyId, id);
    if (!unit) throw new NotFoundError('Unidad');
    return publicUnit(unit);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkDuplicates(actor.companyId, fields, undefined, session);
        const unit = await unitRepository.create({
          ...fields, companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId,
        }, session);
        return publicUnit(unit);
      },
      (unit) => audit(actor, 'create', unit.id, ip, device,
        undefined, { name: unit.name, status: unit.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const unit = await unitRepository.get(actor.companyId, id, session);
        if (!unit) throw new NotFoundError('Unidad');
        if (unit.status !== 'active') throw new ConflictError('Unidad inactiva');
        await checkDuplicates(actor.companyId, fields, id, session);
        oldValue = { name: unit.name, code: unit.code };
        Object.assign(unit, fields, { updatedBy: actor.userId });
        await unitRepository.save(unit, session);
        return publicUnit(unit);
      },
      (unit) => audit(actor, 'update', id, ip, device, oldValue,
        { name: unit.name, code: unit.code }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const unit = await unitRepository.get(actor.companyId, id, session);
        if (!unit) throw new NotFoundError('Unidad');
        if (unit.status !== 'active') throw new ConflictError('Unidad ya inactiva');
        if (await Product.exists({ companyId: actor.companyId, unitId: id,
          status: 'active' }).session(session))
          throw new ConflictError('La unidad tiene productos activos');
        unit.status = 'inactive';
        unit.updatedBy = actor.userId;
        await unitRepository.save(unit, session);
        return publicUnit(unit);
      },
      (unit) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: unit.status }),
    );
  },
};

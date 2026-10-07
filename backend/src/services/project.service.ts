import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { IProjectDocument } from '../models/project.model';
import { projectRepository } from '../repositories/project.repository';
import { auditedMutation } from './auditedMutation';
import { Actor } from './user.service';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

type Input = { code?: string; name?: string; description?: string;
  startDate?: string; endDate?: string; budgetMinor?: number; ownerUserId?: string };
function date(value: string, label: string) {
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value)
    throw new ValidationError(`${label} inválida`);
  return parsed;
}
function validate(body: unknown, creating: boolean): Input {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Proyecto inválido');
  const raw = body as Record<string, unknown>;
  if (!Object.keys(raw).length || Object.keys(raw).some((key) =>
    !['code', 'name', 'description', 'startDate', 'endDate', 'budgetMinor',
      'ownerUserId'].includes(key)))
    throw new ValidationError('Campos de proyecto no permitidos');
  const input: Input = {};
  for (const [key, max] of [['code', 40], ['name', 200], ['description', 1000],
    ['startDate', 10], ['endDate', 10], ['ownerUserId', 24]] as const) {
    if (raw[key] !== undefined) {
      if (typeof raw[key] !== 'string' || (!raw[key].trim() && key !== 'description') ||
        raw[key].length > max) throw new ValidationError(`${key} inválido`);
      input[key] = raw[key].trim();
    }
  }
  if (creating && (!input.code || !input.name || !input.startDate))
    throw new ValidationError('Código, nombre y fecha de inicio obligatorios');
  if (input.code) {
    input.code = input.code.toUpperCase();
    if (!/^[A-Z0-9_-]{1,40}$/.test(input.code))
      throw new ValidationError('Código inválido');
  }
  if (input.startDate) date(input.startDate, 'Fecha de inicio');
  if (input.endDate) date(input.endDate, 'Fecha de término');
  if (input.ownerUserId && !isValidObjectId(input.ownerUserId))
    throw new ValidationError('Responsable inválido');
  if (raw.budgetMinor !== undefined) {
    if (!Number.isSafeInteger(raw.budgetMinor) || Number(raw.budgetMinor) < 0)
      throw new ValidationError('Presupuesto inválido');
    input.budgetMinor = raw.budgetMinor as number;
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate)
    throw new ValidationError('La fecha de término precede al inicio');
  return input;
}
function publicProject(project: IProjectDocument) {
  return { id: String(project._id), code: project.code, name: project.name,
    description: project.description, status: project.status,
    startDate: project.startDate, endDate: project.endDate,
    budgetMinor: project.budgetMinor, ownerUserId: String(project.ownerUserId),
    createdAt: project.createdAt, updatedAt: project.updatedAt };
}
function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  value: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'projects', action,
    entity: 'project', entityId: id, newValue: value, ip, device };
}
async function owner(companyId: string, userId: string, session: mongoose.ClientSession) {
  if (!(await User.exists({ _id: userId, companyId, status: 'active' })
    .session(session).exec())) throw new ValidationError('Responsable ajeno o inactivo');
}
function validateId(id: string) {
  if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
}
export const projectService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    if (query.status !== undefined && !['planned', 'active', 'completed', 'cancelled']
      .includes(String(query.status))) throw new ValidationError('Estado inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100)
      throw new ValidationError('Búsqueda inválida');
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    const safe = search.trim().replace(/[^\p{L}\p{N}\s_-]/gu, '');
    if (safe) filter.$or = [{ name: new RegExp(safe, 'i') },
      { code: new RegExp(safe, 'i') }];
    const { data, total } = await projectRepository.list(actor.companyId, filter,
      paging.skip, paging.limit);
    return { data: data.map(publicProject), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async get(actor: Actor, id: string) {
    validateId(id);
    const project = await projectRepository.get(actor.companyId, id);
    if (!project) throw new NotFoundError('Proyecto');
    return publicProject(project);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const input = validate(body, true);
    return auditedMutation(async (session) => {
      const ownerUserId = input.ownerUserId || actor.userId;
      await owner(actor.companyId, ownerUserId, session);
      if (await projectRepository.duplicate(actor.companyId, input.code!, undefined, session))
        throw new ConflictError('Código de proyecto duplicado');
      const project = await projectRepository.create({ ...input,
        startDate: date(input.startDate!, 'Fecha de inicio'),
        endDate: input.endDate ? date(input.endDate, 'Fecha de término') : undefined,
        ownerUserId, companyId: actor.companyId, status: 'planned',
        createdBy: actor.userId, updatedBy: actor.userId }, session);
      return publicProject(project);
    }, (project) => audit(actor, 'create', project.id, ip, device,
      { code: project.code, status: project.status }));
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    validateId(id); const input = validate(body, false);
    return auditedMutation(async (session) => {
      const project = await projectRepository.get(actor.companyId, id, session);
      if (!project) throw new NotFoundError('Proyecto');
      if (!['planned', 'active'].includes(project.status))
        throw new ConflictError('Proyecto cerrado');
      if (input.ownerUserId) await owner(actor.companyId, input.ownerUserId, session);
      if (input.code && await projectRepository.duplicate(actor.companyId, input.code, id, session))
        throw new ConflictError('Código de proyecto duplicado');
      const startDate = input.startDate ? date(input.startDate, 'Fecha de inicio') : project.startDate;
      const endDate = input.endDate ? date(input.endDate, 'Fecha de término') : project.endDate;
      if (endDate && endDate < startDate) throw new ValidationError('Fechas inválidas');
      const { startDate: _startDate, endDate: _endDate, ...fields } = input;
      Object.assign(project, fields, { startDate, endDate, updatedBy: actor.userId });
      await projectRepository.save(project, session);
      return publicProject(project);
    }, (project) => audit(actor, 'update', id, ip, device,
      { code: project.code, status: project.status }));
  },
  async transition(actor: Actor, id: string, action: 'activate' | 'complete' | 'cancel',
    ip: string, device: string) {
    validateId(id);
    return auditedMutation(async (session) => {
      const project = await projectRepository.get(actor.companyId, id, session);
      if (!project) throw new NotFoundError('Proyecto');
      const allowed = action === 'activate' ? ['planned']
        : action === 'complete' ? ['active'] : ['planned', 'active'];
      if (!allowed.includes(project.status)) throw new ConflictError('Transición de proyecto inválida');
      project.status = action === 'activate' ? 'active'
        : action === 'complete' ? 'completed' : 'cancelled';
      project.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await projectRepository.save(project, session);
      return publicProject(project);
    }, (project) => audit(actor, action, id, ip, device,
      { status: project.status }));
  },
};

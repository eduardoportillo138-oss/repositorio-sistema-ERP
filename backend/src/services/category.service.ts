import mongoose from 'mongoose';
import { ICategoryDocument } from '../models/category.model';
import { Product } from '../models/product.model';
import { categoryRepository } from '../repositories/category.repository';
import { auditedMutation } from './auditedMutation';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';
import { Actor } from './user.service';

const limits = {
  name: 100,
  code: 20,
  description: 500,
} as const;
type Field = keyof typeof limits;
type CategoryInput = Partial<Record<Field, string>>;

function validateFields(body: unknown, creating: boolean): CategoryInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de categoría inválidos');
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((key) => !(key in limits)))
    throw new ValidationError('Campos de categoría no permitidos');
  const clean: CategoryInput = {};
  for (const key of Object.keys(input) as Field[]) {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length > limits[key])
      throw new ValidationError(`${key} inválido`);
    clean[key] = value.trim();
  }
  if (creating && (!clean.name || !clean.code))
    throw new ValidationError('Nombre y código obligatorios');
  if (clean.name !== undefined && !clean.name) throw new ValidationError('Nombre inválido');
  if (clean.code !== undefined) {
    clean.code = clean.code.toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(clean.code)) throw new ValidationError('Código inválido');
  }
  return clean;
}

function publicCategory(category: ICategoryDocument) {
  return {
    id: String(category._id),
    name: category.name,
    code: category.code,
    description: category.description,
    status: category.status,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
  };
}

async function checkDuplicates(
  companyId: string,
  fields: CategoryInput,
  excludeId?: string,
  session?: mongoose.ClientSession,
) {
  for (const key of ['name', 'code'] as const) {
    const value = fields[key];
    if (value && (await categoryRepository.duplicate(companyId, key, value, excludeId, session)))
      throw new ConflictError(`${key} ya existe en la empresa`);
  }
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return {
    userId: actor.userId,
    companyId: actor.companyId,
    module: 'categories',
    action,
    entity: 'category',
    entityId: id,
    oldValue,
    newValue,
    ip,
    device,
  };
}

export const categoryService = {
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
      filter.$or = [{ name: pattern }, { code: pattern }];
    }
    const { data, total } = await categoryRepository.list(actor.companyId, filter, paging.skip, paging.limit);
    return {
      data: data.map(publicCategory),
      pagination: { page: paging.page, limit: paging.limit, total,
        pages: Math.ceil(total / paging.limit) },
    };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const category = await categoryRepository.get(actor.companyId, id);
    if (!category) throw new NotFoundError('Categoría');
    return publicCategory(category);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkDuplicates(actor.companyId, fields, undefined, session);
        const category = await categoryRepository.create({
          ...fields, companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId,
        }, session);
        return publicCategory(category);
      },
      (category) => audit(actor, 'create', category.id, ip, device,
        undefined, { name: category.name, status: category.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const category = await categoryRepository.get(actor.companyId, id, session);
        if (!category) throw new NotFoundError('Categoría');
        if (category.status !== 'active') throw new ConflictError('Categoría inactiva');
        await checkDuplicates(actor.companyId, fields, id, session);
        oldValue = { name: category.name, code: category.code };
        Object.assign(category, fields, { updatedBy: actor.userId });
        await categoryRepository.save(category, session);
        return publicCategory(category);
      },
      (category) => audit(actor, 'update', id, ip, device, oldValue,
        { name: category.name, code: category.code }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const category = await categoryRepository.get(actor.companyId, id, session);
        if (!category) throw new NotFoundError('Categoría');
        if (category.status !== 'active') throw new ConflictError('Categoría ya inactiva');
        if (await Product.exists({ companyId: actor.companyId, categoryId: id,
          status: 'active' }).session(session))
          throw new ConflictError('La categoría tiene productos activos');
        category.status = 'inactive';
        category.updatedBy = actor.userId;
        await categoryRepository.save(category, session);
        return publicCategory(category);
      },
      (category) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: category.status }),
    );
  },
};

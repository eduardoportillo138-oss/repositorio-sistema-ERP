import mongoose from 'mongoose';
import { Category } from '../models/category.model';
import { Unit } from '../models/unit.model';
import { IProductDocument } from '../models/product.model';
import { productRepository } from '../repositories/product.repository';
import { auditedMutation } from './auditedMutation';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';
import { Actor } from './user.service';

type ProductInput = {
  code?: string;
  name?: string;
  description?: string;
  barcode?: string;
  categoryId?: string;
  unitId?: string;
  priceMinor?: number;
  costMinor?: number;
  taxRateBps?: number;
  stockMinimum?: number;
};
const stringLimits = { code: 50, name: 200, description: 1000, barcode: 100,
  categoryId: 24, unitId: 24 } as const;
const numericFields = ['priceMinor', 'costMinor', 'taxRateBps', 'stockMinimum'] as const;

function validateFields(body: unknown, creating: boolean): ProductInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de producto inválidos');
  const input = body as Record<string, unknown>;
  const allowed = [...Object.keys(stringLimits), ...numericFields];
  if (!Object.keys(input).length || Object.keys(input).some((key) => !allowed.includes(key)))
    throw new ValidationError('Campos de producto no permitidos');
  const clean: ProductInput = {};
  for (const key of Object.keys(stringLimits) as Array<keyof typeof stringLimits>) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.trim().length > stringLimits[key])
      throw new ValidationError(`${key} inválido`);
    clean[key] = value.trim();
  }
  if (creating && (!clean.code || !clean.name || !clean.categoryId || !clean.unitId ||
    input.priceMinor === undefined))
    throw new ValidationError('Código, nombre, categoría, unidad y precio obligatorios');
  if (clean.name !== undefined && !clean.name) throw new ValidationError('Nombre inválido');
  if (clean.barcode !== undefined && !clean.barcode)
    throw new ValidationError('Código de barras inválido');
  if (clean.code !== undefined) {
    clean.code = clean.code.toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(clean.code)) throw new ValidationError('Código inválido');
  }
  for (const key of ['categoryId', 'unitId'] as const) {
    if (clean[key] !== undefined && !isValidObjectId(clean[key]))
      throw new ValidationError(`${key} inválido`);
  }
  for (const key of numericFields) {
    if (input[key] === undefined) continue;
    const value = input[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 ||
      (key === 'taxRateBps' && value > 10000))
      throw new ValidationError(`${key} inválido`);
    clean[key] = value;
  }
  return clean;
}

function legacyMinor(value: number | undefined) {
  return value !== undefined && Number.isFinite(value) && value >= 0 &&
    Number.isSafeInteger(Math.round(value * 100)) &&
    Math.abs(value * 100 - Math.round(value * 100)) < 1e-7
    ? Math.round(value * 100) : undefined;
}
function publicProduct(product: IProductDocument) {
  return {
    id: String(product._id),
    code: product.code,
    name: product.name,
    description: product.description,
    barcode: product.barcode,
    categoryId: String(product.categoryId),
    unitId: String(product.unitId),
    priceMinor: product.priceMinor ?? legacyMinor(product.unitPrice),
    costMinor: product.costMinor ?? legacyMinor(product.costPrice),
    taxRateBps: product.taxRateBps ?? (product.taxRate === undefined ? 0 :
      Math.round(product.taxRate * 100)),
    stockMinimum: product.stockMinimum,
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

async function checkReferences(companyId: string, fields: ProductInput,
  session: mongoose.ClientSession) {
  if (fields.categoryId && !await Category.exists({ _id: fields.categoryId, companyId,
    status: 'active' }).session(session))
    throw new ValidationError('Categoría ajena o inactiva');
  if (fields.unitId && !await Unit.exists({ _id: fields.unitId, companyId,
    status: 'active' }).session(session))
    throw new ValidationError('Unidad ajena o inactiva');
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId,
    module: 'products', action, entity: 'product', entityId: id,
    oldValue, newValue, ip, device };
}

export const productService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); }
    catch { throw new ValidationError('Paginación inválida'); }
    if (query.status !== undefined && query.status !== 'active' && query.status !== 'inactive')
      throw new ValidationError('Estado inválido');
    if (query.categoryId !== undefined && !isValidObjectId(query.categoryId))
      throw new ValidationError('categoryId inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100)
      throw new ValidationError('Búsqueda inválida');
    const filter: Record<string, unknown> = {
      status: query.status || { $in: ['active', 'inactive'] },
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    };
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').replaceAll('.', '\\.');
    if (safe) {
      const pattern = new RegExp(safe, 'i');
      filter.$or = [{ name: pattern }, { code: pattern }];
    }
    const { data, total } = await productRepository.list(actor.companyId, filter,
      paging.skip, paging.limit);
    return { data: data.map(publicProduct), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const product = await productRepository.get(actor.companyId, id);
    if (!product) throw new NotFoundError('Producto');
    return publicProduct(product);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkReferences(actor.companyId, fields, session);
        if (fields.code && await productRepository.duplicate(actor.companyId, 'code',
          fields.code, undefined, session)) throw new ConflictError('Código duplicado');
        if (fields.barcode && await productRepository.duplicate(actor.companyId, 'barcode',
          fields.barcode, undefined, session)) throw new ConflictError('Código de barras duplicado');
        const product = await productRepository.create({ ...fields,
          companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId }, session);
        return publicProduct(product);
      },
      (product) => audit(actor, 'create', product.id, ip, device, undefined,
        { code: product.code, priceMinor: product.priceMinor, status: product.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const product = await productRepository.get(actor.companyId, id, session);
        if (!product) throw new NotFoundError('Producto');
        if (product.status !== 'active') throw new ConflictError('Producto inactivo');
        await checkReferences(actor.companyId, fields, session);
        if (fields.code && await productRepository.duplicate(actor.companyId, 'code',
          fields.code, id, session)) throw new ConflictError('Código duplicado');
        if (fields.barcode && await productRepository.duplicate(actor.companyId, 'barcode',
          fields.barcode, id, session)) throw new ConflictError('Código de barras duplicado');
        oldValue = { code: product.code, priceMinor: product.priceMinor };
        Object.assign(product, fields, { updatedBy: actor.userId });
        await productRepository.save(product, session);
        return publicProduct(product);
      },
      (product) => audit(actor, 'update', id, ip, device, oldValue,
        { code: product.code, priceMinor: product.priceMinor }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const product = await productRepository.get(actor.companyId, id, session);
        if (!product) throw new NotFoundError('Producto');
        if (product.status !== 'active') throw new ConflictError('Producto ya inactivo');
        product.status = 'inactive';
        product.isActive = false;
        product.updatedBy = actor.userId;
        await productRepository.save(product, session);
        return publicProduct(product);
      },
      (product) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: product.status }),
    );
  },
};

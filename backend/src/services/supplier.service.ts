import mongoose from 'mongoose';
import { ISupplierDocument } from '../models/supplier.model';
import { supplierRepository } from '../repositories/supplier.repository';
import { auditedMutation } from './auditedMutation';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidEmail, isValidObjectId, pagination } from '../utils/validation';
import { Actor } from './user.service';

const limits = {
  name: 200,
  email: 254,
  phone: 20,
  taxId: 50,
  address: 500,
  city: 100,
  country: 100,
  postalCode: 20,
  notes: 1000,
  contactName: 200,
  paymentTerms: 100,
} as const;
type Field = keyof typeof limits;
type SupplierInput = Partial<Record<Field, string>>;

function validateFields(body: unknown, creating: boolean): SupplierInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de proveedor inválidos');
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((key) => !(key in limits)))
    throw new ValidationError('Campos de proveedor no permitidos');
  const clean: SupplierInput = {};
  for (const key of Object.keys(input) as Field[]) {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length > limits[key])
      throw new ValidationError(`${key} inválido`);
    clean[key] = value.trim();
  }
  if (creating && !clean.name) throw new ValidationError('Nombre obligatorio');
  if (clean.name !== undefined && !clean.name) throw new ValidationError('Nombre inválido');
  if (clean.email) {
    clean.email = clean.email.toLowerCase();
    if (!isValidEmail(clean.email)) throw new ValidationError('Email inválido');
  }
  if (clean.taxId) clean.taxId = clean.taxId.toUpperCase();
  return clean;
}

function publicSupplier(supplier: ISupplierDocument) {
  return {
    id: String(supplier._id),
    name: supplier.name,
    email: supplier.email,
    phone: supplier.phone,
    taxId: supplier.taxId,
    address: supplier.address,
    city: supplier.city,
    country: supplier.country,
    postalCode: supplier.postalCode,
    notes: supplier.notes,
    contactName: supplier.contactName,
    paymentTerms: supplier.paymentTerms,
    status: supplier.status,
    createdAt: supplier.createdAt,
    updatedAt: supplier.updatedAt,
  };
}

async function checkDuplicates(
  companyId: string,
  fields: SupplierInput,
  excludeId?: string,
  session?: mongoose.ClientSession,
) {
  for (const key of ['email', 'taxId'] as const) {
    const value = fields[key];
    if (value && (await supplierRepository.duplicate(companyId, key, value, excludeId, session)))
      throw new ConflictError(`${key} ya existe en la empresa`);
  }
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return {
    userId: actor.userId,
    companyId: actor.companyId,
    module: 'suppliers',
    action,
    entity: 'supplier',
    entityId: id,
    oldValue,
    newValue,
    ip,
    device,
  };
}

export const supplierService = {
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
      filter.$or = [{ name: pattern }, { email: pattern }, { taxId: pattern }];
    }
    const { data, total } = await supplierRepository.list(actor.companyId, filter, paging.skip, paging.limit);
    return {
      data: data.map(publicSupplier),
      pagination: { page: paging.page, limit: paging.limit, total,
        pages: Math.ceil(total / paging.limit) },
    };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const supplier = await supplierRepository.get(actor.companyId, id);
    if (!supplier) throw new NotFoundError('Proveedor');
    return publicSupplier(supplier);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkDuplicates(actor.companyId, fields, undefined, session);
        const supplier = await supplierRepository.create({
          ...fields, companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId,
        }, session);
        return publicSupplier(supplier);
      },
      (supplier) => audit(actor, 'create', supplier.id, ip, device,
        undefined, { name: supplier.name, status: supplier.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const supplier = await supplierRepository.get(actor.companyId, id, session);
        if (!supplier) throw new NotFoundError('Proveedor');
        if (supplier.status !== 'active') throw new ConflictError('Proveedor inactivo');
        await checkDuplicates(actor.companyId, fields, id, session);
        oldValue = { name: supplier.name, email: supplier.email, taxId: supplier.taxId };
        Object.assign(supplier, fields, { updatedBy: actor.userId });
        await supplierRepository.save(supplier, session);
        return publicSupplier(supplier);
      },
      (supplier) => audit(actor, 'update', id, ip, device, oldValue,
        { name: supplier.name, email: supplier.email, taxId: supplier.taxId }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const supplier = await supplierRepository.get(actor.companyId, id, session);
        if (!supplier) throw new NotFoundError('Proveedor');
        if (supplier.status !== 'active') throw new ConflictError('Proveedor ya inactivo');
        supplier.status = 'inactive';
        supplier.updatedBy = actor.userId;
        await supplierRepository.save(supplier, session);
        return publicSupplier(supplier);
      },
      (supplier) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: supplier.status }),
    );
  },
};

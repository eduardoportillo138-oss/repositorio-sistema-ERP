import mongoose from 'mongoose';
import { Branch } from '../models/branch.model';
import { ICustomerDocument } from '../models/customer.model';
import { customerRepository } from '../repositories/customer.repository';
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
  branchId: 24,
} as const;
type Field = keyof typeof limits;
type CustomerInput = Partial<Record<Field, string>>;

function validateFields(body: unknown, creating: boolean): CustomerInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de cliente inválidos');
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((key) => !(key in limits)))
    throw new ValidationError('Campos de cliente no permitidos');
  const clean: CustomerInput = {};
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
  if (clean.branchId !== undefined && !isValidObjectId(clean.branchId))
    throw new ValidationError('branchId inválido');
  return clean;
}

function publicCustomer(customer: ICustomerDocument) {
  return {
    id: String(customer._id),
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    taxId: customer.taxId,
    address: customer.address,
    city: customer.city,
    country: customer.country,
    postalCode: customer.postalCode,
    notes: customer.notes,
    status: customer.status,
    branchId: customer.branchId ? String(customer.branchId) : undefined,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  };
}

async function checkReferences(
  companyId: string,
  fields: CustomerInput,
  session?: mongoose.ClientSession,
) {
  if (fields.branchId) {
    const branch = await Branch.findOne({
      _id: fields.branchId,
      companyId,
      status: 'active',
    })
      .session(session || null)
      .exec();
    if (!branch) throw new ValidationError('Sucursal no pertenece a la empresa o está inactiva');
  }
}

async function checkDuplicates(
  companyId: string,
  fields: CustomerInput,
  excludeId?: string,
  session?: mongoose.ClientSession,
) {
  for (const key of ['email', 'taxId'] as const) {
    const value = fields[key];
    if (value && (await customerRepository.duplicate(companyId, key, value, excludeId, session)))
      throw new ConflictError(`${key} ya existe en la empresa`);
  }
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return {
    userId: actor.userId,
    companyId: actor.companyId,
    module: 'customers',
    action,
    entity: 'customer',
    entityId: id,
    oldValue,
    newValue,
    ip,
    device,
  };
}

export const customerService = {
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
    const { data, total } = await customerRepository.list(actor.companyId, filter, paging.skip, paging.limit);
    return {
      data: data.map(publicCustomer),
      pagination: { page: paging.page, limit: paging.limit, total,
        pages: Math.ceil(total / paging.limit) },
    };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const customer = await customerRepository.get(actor.companyId, id);
    if (!customer) throw new NotFoundError('Cliente');
    return publicCustomer(customer);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkReferences(actor.companyId, fields, session);
        await checkDuplicates(actor.companyId, fields, undefined, session);
        const customer = await customerRepository.create({
          ...fields, companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId,
        }, session);
        return publicCustomer(customer);
      },
      (customer) => audit(actor, 'create', customer.id, ip, device,
        undefined, { name: customer.name, status: customer.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const customer = await customerRepository.get(actor.companyId, id, session);
        if (!customer) throw new NotFoundError('Cliente');
        if (customer.status !== 'active') throw new ConflictError('Cliente inactivo');
        await checkReferences(actor.companyId, fields, session);
        await checkDuplicates(actor.companyId, fields, id, session);
        oldValue = { name: customer.name, email: customer.email, taxId: customer.taxId };
        Object.assign(customer, fields, { updatedBy: actor.userId });
        await customerRepository.save(customer, session);
        return publicCustomer(customer);
      },
      (customer) => audit(actor, 'update', id, ip, device, oldValue,
        { name: customer.name, email: customer.email, taxId: customer.taxId }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const customer = await customerRepository.get(actor.companyId, id, session);
        if (!customer) throw new NotFoundError('Cliente');
        if (customer.status !== 'active') throw new ConflictError('Cliente ya inactivo');
        customer.status = 'inactive';
        customer.updatedBy = actor.userId;
        await customerRepository.save(customer, session);
        return publicCustomer(customer);
      },
      (customer) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: customer.status }),
    );
  },
};

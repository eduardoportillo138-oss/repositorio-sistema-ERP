import mongoose from 'mongoose';
import { IWarehouseDocument } from '../models/warehouse.model';
import { Branch } from '../models/branch.model';
import { InventoryMovement } from '../models/inventoryMovement.model';
import { warehouseRepository } from '../repositories/warehouse.repository';
import { auditedMutation } from './auditedMutation';
import { ConflictError, NotFoundError, ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';
import { Actor } from './user.service';

const limits = {
  name: 200,
  code: 20,
  branchId: 24,
  address: 500,
  location: 500,
} as const;
type Field = keyof typeof limits;
type WarehouseInput = Partial<Record<Field, string>>;

function validateFields(body: unknown, creating: boolean): WarehouseInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Datos de almacén inválidos');
  const input = body as Record<string, unknown>;
  if (!Object.keys(input).length || Object.keys(input).some((key) => !(key in limits)))
    throw new ValidationError('Campos de almacén no permitidos');
  const clean: WarehouseInput = {};
  for (const key of Object.keys(input) as Field[]) {
    const value = input[key];
    if (typeof value !== 'string' || value.trim().length > limits[key])
      throw new ValidationError(`${key} inválido`);
    clean[key] = value.trim();
  }
  if (creating && (!clean.name || !clean.code || !clean.branchId))
    throw new ValidationError('Nombre, código y sucursal obligatorios');
  if (clean.name !== undefined && !clean.name) throw new ValidationError('Nombre inválido');
  if (clean.code !== undefined) {
    clean.code = clean.code.toUpperCase();
    if (!/^[A-Z0-9_-]+$/.test(clean.code)) throw new ValidationError('Código inválido');
  }
  if (clean.branchId !== undefined && !isValidObjectId(clean.branchId))
    throw new ValidationError('Sucursal inválida');
  return clean;
}

function publicWarehouse(warehouse: IWarehouseDocument) {
  return {
    id: String(warehouse._id),
    name: warehouse.name,
    code: warehouse.code,
    branchId: warehouse.branchId ? String(warehouse.branchId) : undefined,
    address: warehouse.address,
    location: warehouse.location,
    status: warehouse.status,
    createdAt: warehouse.createdAt,
    updatedAt: warehouse.updatedAt,
  };
}

async function checkBranch(companyId: string, branchId: string | undefined,
  session: mongoose.ClientSession) {
  if (!branchId) return;
  const branch = await Branch.findOne({ _id: branchId, companyId, status: 'active' })
    .session(session).exec();
  if (!branch) throw new ValidationError('Sucursal ajena o inactiva');
}

async function checkDuplicates(
  companyId: string,
  fields: WarehouseInput,
  excludeId?: string,
  session?: mongoose.ClientSession,
) {
  for (const key of ['name', 'code'] as const) {
    const value = fields[key];
    if (value && (await warehouseRepository.duplicate(companyId, key, value, excludeId, session)))
      throw new ConflictError(`${key} ya existe en la empresa`);
  }
}

function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  oldValue?: Record<string, unknown>, newValue?: Record<string, unknown>) {
  return {
    userId: actor.userId,
    companyId: actor.companyId,
    module: 'warehouses',
    action,
    entity: 'warehouse',
    entityId: id,
    oldValue,
    newValue,
    ip,
    device,
  };
}

export const warehouseService = {
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
    const { data, total } = await warehouseRepository.list(actor.companyId, filter, paging.skip, paging.limit);
    return {
      data: data.map(publicWarehouse),
      pagination: { page: paging.page, limit: paging.limit, total,
        pages: Math.ceil(total / paging.limit) },
    };
  },
  async get(actor: Actor, id: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const warehouse = await warehouseRepository.get(actor.companyId, id);
    if (!warehouse) throw new NotFoundError('Almacén');
    return publicWarehouse(warehouse);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const fields = validateFields(body, true);
    return auditedMutation(
      async (session) => {
        await checkBranch(actor.companyId, fields.branchId, session);
        await checkDuplicates(actor.companyId, fields, undefined, session);
        const warehouse = await warehouseRepository.create({
          ...fields, companyId: actor.companyId, status: 'active',
          createdBy: actor.userId, updatedBy: actor.userId,
        }, session);
        return publicWarehouse(warehouse);
      },
      (warehouse) => audit(actor, 'create', warehouse.id, ip, device,
        undefined, { name: warehouse.name, status: warehouse.status }),
    );
  },
  async update(actor: Actor, id: string, body: unknown, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    const fields = validateFields(body, false);
    let oldValue: Record<string, unknown> = {};
    return auditedMutation(
      async (session) => {
        const warehouse = await warehouseRepository.get(actor.companyId, id, session);
        if (!warehouse) throw new NotFoundError('Almacén');
        if (warehouse.status !== 'active') throw new ConflictError('Almacén inactivo');
        await checkBranch(actor.companyId, fields.branchId, session);
        if (fields.branchId && fields.branchId !== String(warehouse.branchId) &&
          await InventoryMovement.exists({ companyId: actor.companyId, warehouseId: id }).session(session))
          throw new ConflictError('No se puede cambiar de sucursal un almacén con movimientos');
        await checkDuplicates(actor.companyId, fields, id, session);
        oldValue = { name: warehouse.name, code: warehouse.code };
        Object.assign(warehouse, fields, { updatedBy: actor.userId });
        await warehouseRepository.save(warehouse, session);
        return publicWarehouse(warehouse);
      },
      (warehouse) => audit(actor, 'update', id, ip, device, oldValue,
        { name: warehouse.name, code: warehouse.code }),
    );
  },
  async deactivate(actor: Actor, id: string, ip: string, device: string) {
    if (!isValidObjectId(id)) throw new ValidationError('ID inválido');
    return auditedMutation(
      async (session) => {
        const warehouse = await warehouseRepository.get(actor.companyId, id, session);
        if (!warehouse) throw new NotFoundError('Almacén');
        if (warehouse.status !== 'active') throw new ConflictError('Almacén ya inactivo');
        if (await InventoryMovement.exists({ companyId: actor.companyId, warehouseId: id })
          .session(session))
          throw new ConflictError('El almacén tiene movimientos y requiere revisión de inventario');
        warehouse.status = 'inactive';
        warehouse.updatedBy = actor.userId;
        await warehouseRepository.save(warehouse, session);
        return publicWarehouse(warehouse);
      },
      (warehouse) => audit(actor, 'deactivate', id, ip, device,
        undefined, { status: warehouse.status }),
    );
  },
};

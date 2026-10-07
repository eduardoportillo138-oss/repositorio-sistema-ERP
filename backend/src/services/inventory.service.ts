import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Product } from '../models/product.model';
import { Warehouse } from '../models/warehouse.model';
import { InventoryMovement, IInventoryMovementDocument, MovementType } from '../models/inventoryMovement.model';
import { inventoryRepository, StockRow } from '../repositories/inventory.repository';
import { auditedMutation } from './auditedMutation';
import { Actor } from './user.service';
import { ConflictError, InventoryInsufficientError, NotFoundError,
  ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

type Adjustment = { productId: string; warehouseId: string; direction: 'initial' | 'in' | 'out';
  quantityMilli: number; reason: string; notes?: string; unitCostMinor?: number };
type Transfer = { productId: string; fromWarehouseId: string; toWarehouseId: string;
  quantityMilli: number; reason: string; notes?: string };
const id = (value: unknown, label: string): string => {
  if (!isValidObjectId(value)) throw new ValidationError(`${label} inválido`);
  return value;
};
function fields(body: unknown, transfer: false): Adjustment;
function fields(body: unknown, transfer: true): Transfer;
function fields(body: unknown, transfer: boolean): Adjustment | Transfer {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Movimiento inválido');
  const input = body as Record<string, unknown>;
  const allowed = transfer
    ? ['productId', 'fromWarehouseId', 'toWarehouseId', 'quantityMilli', 'quantity', 'reason', 'notes']
    : ['productId', 'warehouseId', 'direction', 'quantityMilli', 'quantity', 'reason', 'notes', 'unitCostMinor'];
  if (Object.keys(input).some((key) => !allowed.includes(key)))
    throw new ValidationError('Campos de inventario no permitidos');
  if ((input.quantityMilli === undefined) === (input.quantity === undefined))
    throw new ValidationError('Indica una cantidad');
  if (input.quantity !== undefined && typeof input.quantity !== 'number')
    throw new ValidationError('Cantidad inválida');
  const milli = input.quantityMilli === undefined
    ? Number(input.quantity) * 1000 : input.quantityMilli;
  if (typeof milli !== 'number' || !Number.isSafeInteger(milli) || milli <= 0 || milli > 1_000_000_000)
    throw new ValidationError('Cantidad inválida');
  if (typeof input.reason !== 'string' || !input.reason.trim() || input.reason.trim().length > 500)
    throw new ValidationError('Motivo inválido');
  if (input.notes !== undefined && (typeof input.notes !== 'string' || input.notes.trim().length > 1000))
    throw new ValidationError('Notas inválidas');
  const common = { productId: id(input.productId, 'Producto'), quantityMilli: milli,
    reason: input.reason.trim(),
    ...(input.notes !== undefined ? { notes: input.notes.trim() } : {}) };
  if (transfer) {
    const fromWarehouseId = id(input.fromWarehouseId, 'Almacén origen');
    const toWarehouseId = id(input.toWarehouseId, 'Almacén destino');
    if (fromWarehouseId === toWarehouseId) throw new ValidationError('Los almacenes deben ser distintos');
    return { ...common, fromWarehouseId, toWarehouseId };
  }
  if (!['initial', 'in', 'out'].includes(String(input.direction)))
    throw new ValidationError('Dirección inválida');
  if (input.unitCostMinor !== undefined &&
    (typeof input.unitCostMinor !== 'number' || !Number.isSafeInteger(input.unitCostMinor) ||
      input.unitCostMinor < 0)) throw new ValidationError('Costo inválido');
  return { ...common, warehouseId: id(input.warehouseId, 'Almacén'),
    direction: input.direction as Adjustment['direction'],
    ...(input.unitCostMinor !== undefined ? { unitCostMinor: input.unitCostMinor as number } : {}) };
}
function publicMovement(movement: IInventoryMovementDocument) {
  return { id: String(movement._id), productId: String(movement.productId),
    warehouseId: String(movement.warehouseId),
    branchId: movement.branchId ? String(movement.branchId) : undefined,
    type: movement.type, quantityMilli: movement.quantityMilli ?? Math.round(movement.quantity * 1000),
    unitCostMinor: movement.unitCostMinor, referenceType: movement.referenceType,
    referenceId: movement.referenceId, reason: movement.reason, notes: movement.notes,
    createdAt: movement.createdAt };
}
function checkedStock(rows: StockRow[], warehouseId?: string) {
  if (rows.some((row) => row.ambiguous || !Number.isSafeInteger(row.quantityMilli) || row.quantityMilli < 0))
    throw new ConflictError('El inventario histórico requiere conciliación antes de consultar o mover existencias');
  return rows.filter((row) => !warehouseId || row.warehouseId === warehouseId)
    .reduce((sum, row) => sum + row.quantityMilli, 0);
}
function assertLegacyStock(product: { stockCurrent?: number }) {
  if (product.stockCurrent !== undefined && product.stockCurrent !== 0)
    throw new ConflictError('El stockCurrent heredado requiere conciliación antes de usar el ledger');
}
async function warehouse(companyId: string, warehouseId: string, session?: mongoose.ClientSession) {
  const value = await Warehouse.findOne({ _id: warehouseId, companyId, status: 'active' })
    .session(session || null).exec();
  if (!value || !value.branchId) throw new ValidationError('Almacén ajeno, inactivo o sin sucursal');
  return value;
}
/** Every writer to the ledger must acquire this product document lock in its transaction. */
export async function lockInventoryProduct(companyId: string, productId: string,
  session: mongoose.ClientSession) {
  const product = await Product.findOneAndUpdate({ _id: productId, companyId, status: 'active' },
    { $inc: { stockRevision: 1 } }, { new: true, session, timestamps: false }).exec();
  if (!product) throw new NotFoundError('Producto activo');
  assertLegacyStock(product);
  return product;
}
export async function availableStock(companyId: string, productId: string,
  warehouseId: string, session?: mongoose.ClientSession) {
  return checkedStock(await inventoryRepository.stock(companyId, [productId], warehouseId, session),
    warehouseId);
}
export async function appendInventoryMovement(actor: Actor, session: mongoose.ClientSession,
  details: { productId: string; warehouseId: string; branchId: string; type: MovementType;
    quantityMilli: number; reason: string; referenceType: string; referenceId: string;
    notes?: string; unitCostMinor?: number }) {
  const [movement] = await InventoryMovement.create([{ ...details,
    companyId: actor.companyId, quantity: details.quantityMilli / 1000,
    createdBy: actor.userId, status: 'confirmed' }], { session });
  return movement;
}
function audit(actor: Actor, action: string, entityId: string, ip: string, device: string,
  newValue: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'inventory',
    action, entity: 'inventoryMovement', entityId, newValue, ip, device };
}

export const inventoryService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    const warehouseId = query.warehouseId === undefined ? undefined : id(query.warehouseId, 'Almacén');
    if (warehouseId) await warehouse(actor.companyId, warehouseId);
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100) throw new ValidationError('Búsqueda inválida');
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').replaceAll('.', '\\.');
    const filter: Record<string, unknown> = { companyId: actor.companyId, status: 'active' };
    if (safe) filter.$or = [{ name: new RegExp(safe, 'i') }, { code: new RegExp(safe, 'i') }];
    const [products, total] = await Promise.all([
      Product.find(filter).sort({ name: 1, _id: 1 }).skip(paging.skip).limit(paging.limit).exec(),
      Product.countDocuments(filter).exec(),
    ]);
    const stocks = await inventoryRepository.stock(actor.companyId,
      products.map((product) => String(product._id)), warehouseId);
    const data = products.map((product) => {
      assertLegacyStock(product);
      const rows = stocks.filter((row) => row.productId === String(product._id));
      const quantityMilli = checkedStock(rows);
      return { productId: String(product._id), code: product.code, name: product.name,
        unitId: String(product.unitId), stockMinimum: product.stockMinimum,
        quantityMilli, lowStock: quantityMilli < product.stockMinimum * 1000 };
    });
    return { data, pagination: { page: paging.page, limit: paging.limit, total,
      pages: Math.ceil(total / paging.limit) } };
  },
  async product(actor: Actor, productId: string) {
    id(productId, 'Producto');
    const product = await Product.findOne({ _id: productId, companyId: actor.companyId }).exec();
    if (!product) throw new NotFoundError('Producto');
    assertLegacyStock(product);
    const stocks = await inventoryRepository.stock(actor.companyId, [productId]);
    const quantityMilli = checkedStock(stocks);
    const warehouses = await Warehouse.find({ _id: { $in: stocks.map((row) => row.warehouseId) },
      companyId: actor.companyId }).select('name code branchId').exec();
    return { productId, code: product.code, name: product.name, unitId: String(product.unitId),
      stockMinimum: product.stockMinimum, quantityMilli,
      lowStock: quantityMilli < product.stockMinimum * 1000,
      warehouses: stocks.map((row) => ({ warehouseId: row.warehouseId,
        warehouseName: warehouses.find((item) => String(item._id) === row.warehouseId)?.name || 'Almacén',
        quantityMilli: row.quantityMilli })) };
  },
  async movements(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    const filter: Record<string, unknown> = {};
    for (const key of ['productId', 'warehouseId'] as const)
      if (query[key] !== undefined) filter[key] = id(query[key], key);
    if (query.type !== undefined) {
      if (typeof query.type !== 'string' || !['INITIAL', 'PURCHASE', 'SALE',
        'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'RETURN'].includes(query.type))
        throw new ValidationError('Tipo inválido');
      filter.type = query.type;
    }
    const { data, total } = await inventoryRepository.movements(actor.companyId,
      filter, paging.skip, paging.limit);
    return { data: data.map(publicMovement), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async adjust(actor: Actor, body: unknown, ip: string, device: string) {
    const input = fields(body, false);
    return auditedMutation(async (session) => {
      const product = await lockInventoryProduct(actor.companyId, input.productId, session);
      const place = await warehouse(actor.companyId, input.warehouseId, session);
      const available = await availableStock(actor.companyId, input.productId,
        input.warehouseId, session);
      if (input.direction === 'initial' &&
        await InventoryMovement.exists({ companyId: actor.companyId,
          productId: input.productId, warehouseId: input.warehouseId }).session(session))
        throw new ConflictError('El inventario inicial solo puede registrarse antes del primer movimiento');
      if (input.direction === 'out' && available < input.quantityMilli)
        throw new InventoryInsufficientError(product.name, available / 1000, input.quantityMilli / 1000);
      const type = input.direction === 'initial' ? 'INITIAL' :
        input.direction === 'in' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
      const movement = await appendInventoryMovement(actor, session, {
        ...input, branchId: String(place.branchId), type, referenceType: 'adjustment',
        referenceId: crypto.randomUUID(),
      });
      return { movement: publicMovement(movement), quantityMilli: available +
        (input.direction === 'out' ? -input.quantityMilli : input.quantityMilli) };
    }, (result) => audit(actor, 'adjust', result.movement.id, ip, device,
      { type: result.movement.type, productId: input.productId,
        warehouseId: input.warehouseId, quantityMilli: input.quantityMilli }));
  },
  async transfer(actor: Actor, body: unknown, ip: string, device: string) {
    const input = fields(body, true);
    return auditedMutation(async (session) => {
      const product = await lockInventoryProduct(actor.companyId, input.productId, session);
      const [source, target] = await Promise.all([
        warehouse(actor.companyId, input.fromWarehouseId, session),
        warehouse(actor.companyId, input.toWarehouseId, session),
      ]);
      const sourceStock = await availableStock(actor.companyId, input.productId,
        input.fromWarehouseId, session);
      const targetStock = await availableStock(actor.companyId, input.productId,
        input.toWarehouseId, session);
      if (sourceStock < input.quantityMilli)
        throw new InventoryInsufficientError(product.name, sourceStock / 1000, input.quantityMilli / 1000);
      const transferId = crypto.randomUUID();
      const outgoing = await appendInventoryMovement(actor, session, {
        productId: input.productId, warehouseId: input.fromWarehouseId,
        branchId: String(source.branchId), type: 'TRANSFER_OUT',
        quantityMilli: input.quantityMilli, reason: input.reason, notes: input.notes,
        referenceType: 'transfer', referenceId: transferId,
      });
      const incoming = await appendInventoryMovement(actor, session, {
        productId: input.productId, warehouseId: input.toWarehouseId,
        branchId: String(target.branchId), type: 'TRANSFER_IN',
        quantityMilli: input.quantityMilli, reason: input.reason, notes: input.notes,
        referenceType: 'transfer', referenceId: transferId,
      });
      return { transferId, outgoing: publicMovement(outgoing), incoming: publicMovement(incoming),
        sourceStockMilli: sourceStock - input.quantityMilli,
        destinationStockMilli: targetStock + input.quantityMilli };
    }, (result) => audit(actor, 'transfer', result.transferId, ip, device,
      { productId: input.productId, fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId, quantityMilli: input.quantityMilli }));
  },
};

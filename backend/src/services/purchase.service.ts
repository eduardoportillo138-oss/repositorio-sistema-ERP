import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Supplier } from '../models/supplier.model';
import { Product } from '../models/product.model';
import { Warehouse } from '../models/warehouse.model';
import { IPurchaseDocument } from '../models/purchase.model';
import { purchaseRepository } from '../repositories/purchase.repository';
import { auditedMutation } from './auditedMutation';
import { availableStock, appendInventoryMovement, lockInventoryProduct } from './inventory.service';
import { calculateOrder, PriceLine } from './order-calculation';
import { createPurchasePayable, cancelPurchasePayable } from './finance.service';
import { Actor } from './user.service';
import { ConflictError, InventoryInsufficientError, NotFoundError,
  ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

type ItemInput = { productId: string; quantityMilli: number;
  unitCostMinor: number; discountMinor?: number };
type PurchaseInput = { supplierId?: string; warehouseId?: string;
  items?: ItemInput[]; notes?: string };
function validateInput(body: unknown, creating: boolean): PurchaseInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Compra inválida');
  const input = body as Record<string, unknown>;
  if ((!creating && !Object.keys(input).length) ||
    Object.keys(input).some((key) => !['supplierId', 'warehouseId', 'items', 'notes'].includes(key)))
    throw new ValidationError('Campos de compra no permitidos');
  if (creating && (!input.supplierId || !input.warehouseId))
    throw new ValidationError('Proveedor y almacén obligatorios');
  for (const key of ['supplierId', 'warehouseId'] as const)
    if (input[key] !== undefined && !isValidObjectId(input[key]))
      throw new ValidationError(`${key} inválido`);
  if (input.notes !== undefined &&
    (typeof input.notes !== 'string' || input.notes.trim().length > 1000))
    throw new ValidationError('Notas inválidas');
  let items: ItemInput[] | undefined;
  if (input.items !== undefined) {
    if (!Array.isArray(input.items) || input.items.length > 100)
      throw new ValidationError('Líneas inválidas');
    items = input.items.map((raw) => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        Object.keys(raw).some((key) => !['productId', 'quantityMilli', 'unitCostMinor', 'discountMinor'].includes(key)) ||
        !isValidObjectId(raw.productId) ||
        !Number.isSafeInteger(raw.quantityMilli) || raw.quantityMilli <= 0 ||
        raw.quantityMilli > 1_000_000_000 ||
        !Number.isSafeInteger(raw.unitCostMinor) || raw.unitCostMinor < 0 ||
        (raw.discountMinor !== undefined &&
          (!Number.isSafeInteger(raw.discountMinor) || raw.discountMinor < 0)))
        throw new ValidationError('Línea inválida');
      return { productId: raw.productId, quantityMilli: raw.quantityMilli,
        unitCostMinor: raw.unitCostMinor,
        discountMinor: raw.discountMinor || 0 };
    });
    if (new Set(items.map((item) => item.productId)).size !== items.length)
      throw new ValidationError('No repitas productos en la misma compra');
  }
  return { supplierId: input.supplierId as string | undefined,
    warehouseId: input.warehouseId as string | undefined, items,
    notes: input.notes === undefined ? undefined : (input.notes as string).trim() };
}
async function purchaseLines(companyId: string, items: ItemInput[], session: mongoose.ClientSession) {
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) },
    companyId, status: 'active' }).session(session).exec();
  if (products.length !== items.length) throw new ValidationError('Producto ajeno o inactivo');
  const lines: PriceLine[] = items.map((item) => {
    const product = products.find((row) => String(row._id) === item.productId)!;
    return { productId: item.productId, name: product.name,
      quantityMilli: item.quantityMilli,
      unitPriceMinor: item.unitCostMinor,
      discountMinor: item.discountMinor || 0,
      taxRateBps: product.taxRateBps ?? Math.round((product.taxRate || 0) * 100) };
  });
  const totals = calculateOrder(lines);
  return { ...totals, items: totals.items.map(({ unitPriceMinor, ...line }) =>
    ({ ...line, unitCostMinor: unitPriceMinor })) };
}
async function references(companyId: string, supplierId: string, warehouseId: string,
  session: mongoose.ClientSession) {
  const [supplier, warehouse] = await Promise.all([
    Supplier.findOne({ _id: supplierId, companyId, status: 'active' }).session(session).exec(),
    Warehouse.findOne({ _id: warehouseId, companyId, status: 'active' }).session(session).exec(),
  ]);
  if (!supplier || !warehouse?.branchId)
    throw new ValidationError('Proveedor o almacén ajeno, inactivo o sin sucursal');
  return { supplier, warehouse };
}
function publicPurchase(purchase: IPurchaseDocument) {
  return { id: String(purchase._id), folio: purchase.folio, status: purchase.status,
    supplierId: String(purchase.supplierId), supplierName: purchase.supplierName,
    warehouseId: String(purchase.warehouseId), warehouseName: purchase.warehouseName,
    branchId: String(purchase.branchId), notes: purchase.notes,
    items: purchase.items.map((item) => ({ productId: String(item.productId), name: item.name,
      quantityMilli: item.quantityMilli, unitCostMinor: item.unitCostMinor,
      discountMinor: item.discountMinor, taxRateBps: item.taxRateBps,
      subtotalMinor: item.subtotalMinor, taxMinor: item.taxMinor,
      totalMinor: item.totalMinor })),
    subtotalMinor: purchase.subtotalMinor, discountMinor: purchase.discountMinor,
    taxMinor: purchase.taxMinor, totalMinor: purchase.totalMinor,
    createdAt: purchase.createdAt, updatedAt: purchase.updatedAt,
    receivedAt: purchase.receivedAt, cancelledAt: purchase.cancelledAt };
}
function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  value: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'purchases', action,
    entity: 'purchase', entityId: id, newValue: value, ip, device };
}
function validateId(value: string) {
  if (!isValidObjectId(value)) throw new ValidationError('ID inválido');
}
export const purchaseService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    if (query.status !== undefined && !['draft', 'received', 'cancelled'].includes(String(query.status)))
      throw new ValidationError('Estado inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100) throw new ValidationError('Búsqueda inválida');
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').replaceAll('.', '\\.');
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (safe) filter.$or = [{ folio: new RegExp(safe, 'i') },
      { supplierName: new RegExp(safe, 'i') }];
    const { data, total } = await purchaseRepository.list(actor.companyId, filter,
      paging.skip, paging.limit);
    return { data: data.map(publicPurchase), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async get(actor: Actor, purchaseId: string) {
    validateId(purchaseId);
    const purchase = await purchaseRepository.get(actor.companyId, purchaseId);
    if (!purchase) throw new NotFoundError('Compra');
    return publicPurchase(purchase);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const input = validateInput(body, true);
    return auditedMutation(async (session) => {
      const { supplier, warehouse } = await references(actor.companyId,
        input.supplierId!, input.warehouseId!, session);
      const totals = await purchaseLines(actor.companyId, input.items || [], session);
      const purchase = await purchaseRepository.create({ companyId: actor.companyId,
        branchId: warehouse.branchId, supplierId: supplier._id,
        supplierName: supplier.name, warehouseId: warehouse._id,
        warehouseName: warehouse.name, folio: 'C-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
        status: 'draft', ...totals, notes: input.notes, createdBy: actor.userId,
        updatedBy: actor.userId }, session);
      return publicPurchase(purchase);
    }, (purchase) => audit(actor, 'create', purchase.id, ip, device,
      { folio: purchase.folio, status: purchase.status, totalMinor: purchase.totalMinor }));
  },
  async update(actor: Actor, purchaseId: string, body: unknown, ip: string, device: string) {
    validateId(purchaseId);
    const input = validateInput(body, false);
    return auditedMutation(async (session) => {
      const purchase = await purchaseRepository.get(actor.companyId, purchaseId, session);
      if (!purchase) throw new NotFoundError('Compra');
      if (purchase.status !== 'draft') throw new ConflictError('Solo se puede editar un borrador');
      const { supplier, warehouse } = await references(actor.companyId,
        input.supplierId || String(purchase.supplierId),
        input.warehouseId || String(purchase.warehouseId), session);
      purchase.supplierId = supplier._id; purchase.supplierName = supplier.name;
      purchase.warehouseId = warehouse._id; purchase.warehouseName = warehouse.name;
      purchase.branchId = warehouse.branchId!;
      if (input.items !== undefined) Object.assign(purchase,
        await purchaseLines(actor.companyId, input.items, session));
      if (input.notes !== undefined) purchase.notes = input.notes;
      purchase.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await purchaseRepository.save(purchase, session);
      return publicPurchase(purchase);
    }, (purchase) => audit(actor, 'update', purchase.id, ip, device,
      { status: purchase.status, totalMinor: purchase.totalMinor }));
  },
  async confirm(actor: Actor, purchaseId: string, ip: string, device: string) {
    validateId(purchaseId);
    return auditedMutation(async (session) => {
      const purchase = await purchaseRepository.get(actor.companyId, purchaseId, session);
      if (!purchase) throw new NotFoundError('Compra');
      if (purchase.status !== 'draft') throw new ConflictError('Transición de compra inválida');
      if (!purchase.items.length) throw new ValidationError('Agrega productos antes de recibir');
      await references(actor.companyId, String(purchase.supplierId), String(purchase.warehouseId), session);
      const sorted = [...purchase.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      for (const item of sorted)
        await lockInventoryProduct(actor.companyId, String(item.productId), session);
      for (const item of purchase.items) await appendInventoryMovement(actor, session, {
        productId: String(item.productId), warehouseId: String(purchase.warehouseId),
        branchId: String(purchase.branchId), type: 'PURCHASE', quantityMilli: item.quantityMilli,
        unitCostMinor: item.unitCostMinor,
        reason: 'Recepción de compra ' + purchase.folio,
        referenceType: 'purchase', referenceId: purchaseId,
      });
      purchase.status = 'received'; purchase.receivedBy = new mongoose.Types.ObjectId(actor.userId);
      purchase.receivedAt = new Date();
      await purchaseRepository.save(purchase, session);
      await createPurchasePayable(purchase, session);
      return publicPurchase(purchase);
    }, (purchase) => audit(actor, 'confirm', purchase.id, ip, device,
      { status: purchase.status, totalMinor: purchase.totalMinor }));
  },
  async cancel(actor: Actor, purchaseId: string, ip: string, device: string) {
    validateId(purchaseId);
    return auditedMutation(async (session) => {
      const purchase = await purchaseRepository.get(actor.companyId, purchaseId, session);
      if (!purchase) throw new NotFoundError('Compra');
      if (purchase.status === 'cancelled') throw new ConflictError('Compra ya cancelada');
      if (purchase.status === 'received') {
        if (purchase.totalMinor > 0) await cancelPurchasePayable(actor.companyId, purchaseId, session);
        const sorted = [...purchase.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
        for (const item of sorted) {
          const product = await lockInventoryProduct(actor.companyId, String(item.productId), session, true);
          const available = await availableStock(actor.companyId, String(item.productId),
            String(purchase.warehouseId), session);
          if (available < item.quantityMilli)
            throw new InventoryInsufficientError(product.name, available / 1000,
              item.quantityMilli / 1000);
        }
        for (const item of purchase.items) await appendInventoryMovement(actor, session, {
          productId: String(item.productId), warehouseId: String(purchase.warehouseId),
          branchId: String(purchase.branchId), type: 'ADJUSTMENT_OUT', quantityMilli: item.quantityMilli,
          reason: 'Cancelación de compra ' + purchase.folio,
          referenceType: 'purchase', referenceId: purchaseId,
        });
      }
      purchase.status = 'cancelled'; purchase.cancelledBy = new mongoose.Types.ObjectId(actor.userId);
      purchase.cancelledAt = new Date();
      await purchaseRepository.save(purchase, session);
      return publicPurchase(purchase);
    }, (purchase) => audit(actor, 'cancel', purchase.id, ip, device, { status: purchase.status }));
  },
};

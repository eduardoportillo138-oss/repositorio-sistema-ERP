import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { Customer } from '../models/customer.model';
import { Product } from '../models/product.model';
import { Warehouse } from '../models/warehouse.model';
import { ISaleDocument } from '../models/sale.model';
import { saleRepository } from '../repositories/sale.repository';
import { auditedMutation } from './auditedMutation';
import { availableStock, appendInventoryMovement, lockInventoryProduct } from './inventory.service';
import { calculateOrder, PriceLine } from './order-calculation';
import { createSaleReceivable, cancelSaleReceivable } from './finance.service';
import { Actor } from './user.service';
import { ConflictError, InventoryInsufficientError, NotFoundError,
  ValidationError } from '../errors/AppError';
import { isValidObjectId, pagination } from '../utils/validation';

type ItemInput = { productId: string; quantityMilli: number; discountMinor?: number };
type SaleInput = { customerId?: string; warehouseId?: string;
  items?: ItemInput[]; notes?: string };
function validateInput(body: unknown, creating: boolean): SaleInput {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new ValidationError('Venta inválida');
  const input = body as Record<string, unknown>;
  if ((!creating && !Object.keys(input).length) ||
    Object.keys(input).some((key) => !['customerId', 'warehouseId', 'items', 'notes'].includes(key)))
    throw new ValidationError('Campos de venta no permitidos');
  if (creating && (!input.customerId || !input.warehouseId))
    throw new ValidationError('Cliente y almacén obligatorios');
  for (const key of ['customerId', 'warehouseId'] as const)
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
        Object.keys(raw).some((key) => !['productId', 'quantityMilli', 'discountMinor'].includes(key)) ||
        !isValidObjectId(raw.productId) ||
        !Number.isSafeInteger(raw.quantityMilli) || raw.quantityMilli <= 0 ||
        raw.quantityMilli > 1_000_000_000 ||
        (raw.discountMinor !== undefined &&
          (!Number.isSafeInteger(raw.discountMinor) || raw.discountMinor < 0)))
        throw new ValidationError('Línea inválida');
      return { productId: raw.productId, quantityMilli: raw.quantityMilli,
        discountMinor: raw.discountMinor || 0 };
    });
    if (new Set(items.map((item) => item.productId)).size !== items.length)
      throw new ValidationError('No repitas productos en la misma venta');
  }
  return { customerId: input.customerId as string | undefined,
    warehouseId: input.warehouseId as string | undefined, items,
    notes: input.notes === undefined ? undefined : (input.notes as string).trim() };
}
function legacyMinor(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value < 0 ||
    !Number.isSafeInteger(Math.round(value * 100)) ||
    Math.abs(value * 100 - Math.round(value * 100)) > 1e-7)
    throw new ValidationError('El producto no tiene precio válido en centavos');
  return Math.round(value * 100);
}
async function saleLines(companyId: string, items: ItemInput[], session: mongoose.ClientSession) {
  const products = await Product.find({ _id: { $in: items.map((item) => item.productId) },
    companyId, status: 'active' }).session(session).exec();
  if (products.length !== items.length) throw new ValidationError('Producto ajeno o inactivo');
  const lines: PriceLine[] = items.map((item) => {
    const product = products.find((row) => String(row._id) === item.productId)!;
    return { productId: item.productId, name: product.name,
      quantityMilli: item.quantityMilli,
      unitPriceMinor: product.priceMinor ?? legacyMinor(product.unitPrice),
      discountMinor: item.discountMinor || 0,
      taxRateBps: product.taxRateBps ?? Math.round((product.taxRate || 0) * 100) };
  });
  return calculateOrder(lines);
}
async function references(companyId: string, customerId: string, warehouseId: string,
  session: mongoose.ClientSession) {
  const [customer, warehouse] = await Promise.all([
    Customer.findOne({ _id: customerId, companyId, status: 'active' }).session(session).exec(),
    Warehouse.findOne({ _id: warehouseId, companyId, status: 'active' }).session(session).exec(),
  ]);
  if (!customer || !warehouse?.branchId)
    throw new ValidationError('Cliente o almacén ajeno, inactivo o sin sucursal');
  return { customer, warehouse };
}
function publicSale(sale: ISaleDocument) {
  return { id: String(sale._id), folio: sale.folio, status: sale.status,
    customerId: String(sale.customerId), customerName: sale.customerName,
    warehouseId: String(sale.warehouseId), warehouseName: sale.warehouseName,
    branchId: String(sale.branchId), notes: sale.notes,
    items: sale.items.map((item) => ({ productId: String(item.productId), name: item.name,
      quantityMilli: item.quantityMilli, unitPriceMinor: item.unitPriceMinor,
      discountMinor: item.discountMinor, taxRateBps: item.taxRateBps,
      subtotalMinor: item.subtotalMinor, taxMinor: item.taxMinor,
      totalMinor: item.totalMinor })),
    subtotalMinor: sale.subtotalMinor, discountMinor: sale.discountMinor,
    taxMinor: sale.taxMinor, totalMinor: sale.totalMinor,
    createdAt: sale.createdAt, updatedAt: sale.updatedAt,
    confirmedAt: sale.confirmedAt, cancelledAt: sale.cancelledAt };
}
function audit(actor: Actor, action: string, id: string, ip: string, device: string,
  value: Record<string, unknown>) {
  return { userId: actor.userId, companyId: actor.companyId, module: 'sales', action,
    entity: 'sale', entityId: id, newValue: value, ip, device };
}
function validateId(value: string) {
  if (!isValidObjectId(value)) throw new ValidationError('ID inválido');
}
export const saleService = {
  async list(actor: Actor, query: Record<string, unknown>) {
    let paging;
    try { paging = pagination(query); } catch { throw new ValidationError('Paginación inválida'); }
    if (query.status !== undefined && !['draft', 'confirmed', 'cancelled'].includes(String(query.status)))
      throw new ValidationError('Estado inválido');
    const search = query.search === undefined ? '' : query.search;
    if (typeof search !== 'string' || search.length > 100) throw new ValidationError('Búsqueda inválida');
    const safe = search.trim().replace(/[^\p{L}\p{N}\s@.-]/gu, '').replaceAll('.', '\\.');
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (safe) filter.$or = [{ folio: new RegExp(safe, 'i') },
      { customerName: new RegExp(safe, 'i') }];
    const { data, total } = await saleRepository.list(actor.companyId, filter,
      paging.skip, paging.limit);
    return { data: data.map(publicSale), pagination: { page: paging.page,
      limit: paging.limit, total, pages: Math.ceil(total / paging.limit) } };
  },
  async get(actor: Actor, saleId: string) {
    validateId(saleId);
    const sale = await saleRepository.get(actor.companyId, saleId);
    if (!sale) throw new NotFoundError('Venta');
    return publicSale(sale);
  },
  async create(actor: Actor, body: unknown, ip: string, device: string) {
    const input = validateInput(body, true);
    return auditedMutation(async (session) => {
      const { customer, warehouse } = await references(actor.companyId,
        input.customerId!, input.warehouseId!, session);
      const totals = await saleLines(actor.companyId, input.items || [], session);
      const sale = await saleRepository.create({ companyId: actor.companyId,
        branchId: warehouse.branchId, customerId: customer._id,
        customerName: customer.name, warehouseId: warehouse._id,
        warehouseName: warehouse.name, folio: 'V-' + crypto.randomUUID().slice(0, 12).toUpperCase(),
        status: 'draft', ...totals, notes: input.notes, createdBy: actor.userId,
        updatedBy: actor.userId }, session);
      return publicSale(sale);
    }, (sale) => audit(actor, 'create', sale.id, ip, device,
      { folio: sale.folio, status: sale.status, totalMinor: sale.totalMinor }));
  },
  async update(actor: Actor, saleId: string, body: unknown, ip: string, device: string) {
    validateId(saleId);
    const input = validateInput(body, false);
    return auditedMutation(async (session) => {
      const sale = await saleRepository.get(actor.companyId, saleId, session);
      if (!sale) throw new NotFoundError('Venta');
      if (sale.status !== 'draft') throw new ConflictError('Solo se puede editar un borrador');
      const { customer, warehouse } = await references(actor.companyId,
        input.customerId || String(sale.customerId),
        input.warehouseId || String(sale.warehouseId), session);
      sale.customerId = customer._id; sale.customerName = customer.name;
      sale.warehouseId = warehouse._id; sale.warehouseName = warehouse.name;
      sale.branchId = warehouse.branchId!;
      if (input.items !== undefined) Object.assign(sale,
        await saleLines(actor.companyId, input.items, session));
      if (input.notes !== undefined) sale.notes = input.notes;
      sale.updatedBy = new mongoose.Types.ObjectId(actor.userId);
      await saleRepository.save(sale, session);
      return publicSale(sale);
    }, (sale) => audit(actor, 'update', sale.id, ip, device,
      { status: sale.status, totalMinor: sale.totalMinor }));
  },
  async confirm(actor: Actor, saleId: string, ip: string, device: string) {
    validateId(saleId);
    return auditedMutation(async (session) => {
      const sale = await saleRepository.get(actor.companyId, saleId, session);
      if (!sale) throw new NotFoundError('Venta');
      if (sale.status !== 'draft') throw new ConflictError('Transición de venta inválida');
      if (!sale.items.length) throw new ValidationError('Agrega productos antes de confirmar');
      await references(actor.companyId, String(sale.customerId), String(sale.warehouseId), session);
      const sorted = [...sale.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
      for (const item of sorted) {
        const product = await lockInventoryProduct(actor.companyId, String(item.productId), session);
        const available = await availableStock(actor.companyId, String(item.productId),
          String(sale.warehouseId), session);
        if (available < item.quantityMilli)
          throw new InventoryInsufficientError(product.name, available / 1000,
            item.quantityMilli / 1000);
      }
      for (const item of sale.items) await appendInventoryMovement(actor, session, {
        productId: String(item.productId), warehouseId: String(sale.warehouseId),
        branchId: String(sale.branchId), type: 'SALE', quantityMilli: item.quantityMilli,
        reason: 'Confirmación de venta ' + sale.folio,
        referenceType: 'sale', referenceId: saleId,
      });
      sale.status = 'confirmed'; sale.confirmedBy = new mongoose.Types.ObjectId(actor.userId);
      sale.confirmedAt = new Date();
      await saleRepository.save(sale, session);
      await createSaleReceivable(sale, session);
      return publicSale(sale);
    }, (sale) => audit(actor, 'confirm', sale.id, ip, device,
      { status: sale.status, totalMinor: sale.totalMinor }));
  },
  async cancel(actor: Actor, saleId: string, ip: string, device: string) {
    validateId(saleId);
    return auditedMutation(async (session) => {
      const sale = await saleRepository.get(actor.companyId, saleId, session);
      if (!sale) throw new NotFoundError('Venta');
      if (sale.status === 'cancelled') throw new ConflictError('Venta ya cancelada');
      if (sale.status === 'confirmed') {
        if (sale.totalMinor > 0) await cancelSaleReceivable(actor.companyId, saleId, session);
        const sorted = [...sale.items].sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
        for (const item of sorted)
          await lockInventoryProduct(actor.companyId, String(item.productId), session, true);
        for (const item of sale.items) await appendInventoryMovement(actor, session, {
          productId: String(item.productId), warehouseId: String(sale.warehouseId),
          branchId: String(sale.branchId), type: 'RETURN', quantityMilli: item.quantityMilli,
          reason: 'Cancelación de venta ' + sale.folio,
          referenceType: 'sale', referenceId: saleId,
        });
      }
      sale.status = 'cancelled'; sale.cancelledBy = new mongoose.Types.ObjectId(actor.userId);
      sale.cancelledAt = new Date();
      await saleRepository.save(sale, session);
      return publicSale(sale);
    }, (sale) => audit(actor, 'cancel', sale.id, ip, device, { status: sale.status }));
  },
};

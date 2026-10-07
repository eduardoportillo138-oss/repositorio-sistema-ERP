import mongoose from 'mongoose';
import { Sale } from '../models/sale.model';
import { Purchase } from '../models/purchase.model';
import { Product } from '../models/product.model';
import { Customer } from '../models/customer.model';
import { Supplier } from '../models/supplier.model';
import { Lead } from '../models/lead.model';
import { InventoryMovement } from '../models/inventoryMovement.model';
import { AccountsReceivable } from '../models/accountsReceivable.model';
import { AccountsPayable } from '../models/accountsPayable.model';
import { Actor } from './user.service';
import { ValidationError } from '../errors/AppError';

function tenant(actor: Actor) {
  if (!mongoose.isValidObjectId(actor.companyId)) throw new ValidationError('Empresa inválida');
  return new mongoose.Types.ObjectId(actor.companyId);
}

async function monthlyTotals(model: typeof Sale | typeof Purchase, companyId: mongoose.Types.ObjectId) {
  const start = new Date();
  start.setUTCMonth(start.getUTCMonth() - 5);
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const rows = await model.aggregate<{ _id: Date; totalMinor: number }>([
    { $match: { companyId, status: model === Sale ? 'confirmed' : 'received', createdAt: { $gte: start } } },
    { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'month' } }, totalMinor: { $sum: '$totalMinor' } } },
    { $sort: { _id: 1 } },
  ]).exec();
  const byMonth = new Map(rows.map((row) => [row._id.toISOString().slice(0, 7), row.totalMinor]));
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + offset, 1));
    return { label: date.toISOString().slice(0, 7), value: byMonth.get(date.toISOString().slice(0, 7)) || 0 };
  });
}

export const reportService = {
  async dashboard(actor: Actor) {
    const companyId = tenant(actor);
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(1);
    const [sales, purchases, customers, suppliers, products, leads, receivable, payable,
      salesSeries, purchasesSeries, lowStockProducts] = await Promise.all([
      Sale.aggregate<{ total: number; count: number }>([
        { $match: { companyId, status: 'confirmed', createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$totalMinor' }, count: { $sum: 1 } } },
      ]).exec(),
      Purchase.aggregate<{ total: number }>([
        { $match: { companyId, status: 'received', createdAt: { $gte: start } } },
        { $group: { _id: null, total: { $sum: '$totalMinor' } } },
      ]).exec(),
      Customer.countDocuments({ companyId, status: 'active' }).exec(),
      Supplier.countDocuments({ companyId, status: 'active' }).exec(),
      Product.countDocuments({ companyId, status: 'active' }).exec(),
      Lead.countDocuments({ companyId, status: 'new' }).exec(),
      AccountsReceivable.aggregate<{ total: number }>([
        { $match: { companyId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balanceMinor' } } },
      ]).exec(),
      AccountsPayable.aggregate<{ total: number }>([
        { $match: { companyId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$balanceMinor' } } },
      ]).exec(),
      monthlyTotals(Sale, companyId), monthlyTotals(Purchase, companyId),
      this.lowStockCount(companyId),
    ]);
    return {
      metrics: {
        sales: sales[0]?.total || 0,
        customers,
        products,
        suppliers,
        invoices: sales[0]?.count || 0,
        leads,
        lowStock: lowStockProducts,
        accountsReceivable: receivable[0]?.total || 0,
        accountsPayable: payable[0]?.total || 0,
      },
      series: { sales: salesSeries, purchases: purchasesSeries },
      unit: 'minor',
      period: { from: start.toISOString(), to: new Date().toISOString() },
    };
  },

  async sales(actor: Actor, query: Record<string, unknown>) {
    const companyId = tenant(actor);
    const { from, to } = dateRange(query);
    const [totals, byStatus] = await Promise.all([
      Sale.aggregate([
        { $match: { companyId, status: 'confirmed', createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: null, totalMinor: { $sum: '$totalMinor' }, count: { $sum: 1 }, taxMinor: { $sum: '$taxMinor' } } },
      ]).exec(),
      Sale.aggregate([
        { $match: { companyId, createdAt: { $gte: from, $lte: to } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }, { $sort: { _id: 1 } },
      ]).exec(),
    ]);
    return { from, to, totals: totals[0] || { totalMinor: 0, count: 0, taxMinor: 0 }, byStatus,
      unit: 'minor' };
  },

  async inventory(actor: Actor) {
    const companyId = tenant(actor);
    const stockRows = await InventoryMovement.aggregate<{ _id: mongoose.Types.ObjectId; quantityMilli: number }>([
      { $match: { companyId: actor.companyId, status: 'confirmed' } },
      { $group: { _id: '$productId', quantityMilli: { $sum: { $multiply: [
        { $ifNull: ['$quantityMilli', { $multiply: ['$quantity', 1000] }] },
        { $cond: [{ $in: ['$type', ['SALE', 'sale', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'exit']] }, -1, 1] },
      ] } } } },
    ]).exec();
    const stock = new Map(stockRows.map((row) => [String(row._id), row.quantityMilli]));
    const products = await Product.find({ companyId, status: 'active' }).select('_id code name stockMinimum').lean().exec();
    const lowStock = products.filter((product) => (stock.get(String(product._id)) || 0) <
      Math.round(Number(product.stockMinimum || 0) * 1000));
    return { productCount: products.length, lowStockCount: lowStock.length,
      lowStock: lowStock.slice(0, 100).map((product) => ({ id: String(product._id), code: product.code,
        name: product.name, stockMilli: stock.get(String(product._id)) || 0,
        minimumMilli: Math.round(Number(product.stockMinimum || 0) * 1000) })), unit: 'milli' };
  },

  async finance(actor: Actor) {
    const companyId = tenant(actor);
    const [receivables, payables] = await Promise.all([
      AccountsReceivable.aggregate([
        { $match: { companyId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: '$status', count: { $sum: 1 }, amountMinor: { $sum: '$balanceMinor' } } },
      ]).exec(),
      AccountsPayable.aggregate([
        { $match: { companyId, status: { $in: ['pending', 'partial'] } } },
        { $group: { _id: '$status', count: { $sum: 1 }, amountMinor: { $sum: '$balanceMinor' } } },
      ]).exec(),
    ]);
    return { receivables, payables, unit: 'minor' };
  },

  async lowStockCount(companyId: mongoose.Types.ObjectId) {
    const rows = await InventoryMovement.aggregate<{ _id: mongoose.Types.ObjectId; quantityMilli: number }>([
      { $match: { companyId: String(companyId), status: 'confirmed' } },
      { $group: { _id: '$productId', quantityMilli: { $sum: { $multiply: [
        { $ifNull: ['$quantityMilli', { $multiply: ['$quantity', 1000] }] },
        { $cond: [{ $in: ['$type', ['SALE', 'sale', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'exit']] }, -1, 1] },
      ] } } } },
    ]).exec();
    const quantities = new Map(rows.map((row) => [String(row._id), row.quantityMilli]));
    const products = await Product.find({ companyId, status: 'active' }).select('_id stockMinimum').lean().exec();
    return products.filter((product) => (quantities.get(String(product._id)) || 0) <
      Math.round(Number(product.stockMinimum || 0) * 1000)).length;
  },
};

function dateRange(query: Record<string, unknown>) {
  const to = query.to === undefined ? new Date() : new Date(String(query.to));
  const from = query.from === undefined ? new Date(to.getTime() - 30 * 86400000) : new Date(String(query.from));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to ||
    to.getTime() - from.getTime() > 366 * 86400000) throw new ValidationError('Rango de fechas inválido');
  return { from, to };
}

import mongoose from 'mongoose';
import { InventoryMovement } from '../models/inventoryMovement.model';

const positive = ['INITIAL', 'PURCHASE', 'ADJUSTMENT_IN', 'TRANSFER_IN', 'RETURN',
  'entry', 'return'];
const negative = ['SALE', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'exit'];
const known = [...positive, ...negative];

export interface StockRow {
  productId: string;
  warehouseId: string;
  quantityMilli: number;
  ambiguous: number;
}

export const inventoryRepository = {
  /** Ledger aggregation; unknown legacy transfer/adjustment directions block reported stock. */
  async stock(companyId: string, productIds: string[], warehouseId?: string,
    session?: mongoose.ClientSession): Promise<StockRow[]> {
    if (!productIds.length) return [];
    const match = { companyId, status: 'confirmed',
      productId: { $in: productIds.map((id) => new mongoose.Types.ObjectId(id)) },
      ...(warehouseId ? { warehouseId: new mongoose.Types.ObjectId(warehouseId) } : {}) };
    const units = { $ifNull: ['$quantityMilli', { $multiply: ['$quantity', 1000] }] };
    const cursor = InventoryMovement.aggregate([
      { $match: match },
      { $group: {
        _id: { productId: '$productId', warehouseId: '$warehouseId' },
        quantityMilli: { $sum: { $multiply: [
          { $switch: { branches: [
            { case: { $in: ['$type', positive] }, then: 1 },
            { case: { $in: ['$type', negative] }, then: -1 },
          ], default: 0 } },
          units,
        ] } },
        ambiguous: { $sum: { $cond: [{ $and: [
          { $in: ['$type', known] }, { $gt: [units, 0] },
          { $eq: [units, { $round: [units, 0] }] },
        ] }, 0, 1] } },
      } },
    ]);
    if (session) cursor.session(session);
    const groups = await cursor.exec();
    return groups.map((row) => ({
      productId: String(row._id.productId), warehouseId: String(row._id.warehouseId),
      quantityMilli: row.quantityMilli, ambiguous: row.ambiguous,
    }));
  },
  async movements(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      InventoryMovement.find(scoped).sort({ createdAt: -1, _id: -1 })
        .skip(skip).limit(limit).exec(),
      InventoryMovement.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
};

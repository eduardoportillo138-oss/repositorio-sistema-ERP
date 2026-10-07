import mongoose from 'mongoose';
import { Purchase, IPurchaseDocument } from '../models/purchase.model';

export const purchaseRepository = {
  async list(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Purchase.find(scoped).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Purchase.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Purchase.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Purchase.create([data], { session }))[0];
  },
  save(purchase: IPurchaseDocument, session: mongoose.ClientSession) {
    return purchase.save({ session });
  },
};

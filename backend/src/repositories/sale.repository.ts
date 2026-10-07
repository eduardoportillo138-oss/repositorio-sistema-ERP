import mongoose from 'mongoose';
import { Sale, ISaleDocument } from '../models/sale.model';

export const saleRepository = {
  async list(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Sale.find(scoped).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Sale.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Sale.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Sale.create([data], { session }))[0];
  },
  save(sale: ISaleDocument, session: mongoose.ClientSession) {
    return sale.save({ session });
  },
};

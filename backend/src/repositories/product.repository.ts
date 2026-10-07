import mongoose from 'mongoose';
import { Product, IProductDocument } from '../models/product.model';

export const productRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: IProductDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Product.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Product.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Product.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Product.create([data], { session }))[0];
  },
  save(product: IProductDocument, session: mongoose.ClientSession) {
    return product.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'code' | 'barcode',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Product.exists({
      companyId,
      status: 'active',
      [field]: value,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .collation({ locale: 'es', strength: 2 })
      .session(session || null)
      .exec();
  },
};

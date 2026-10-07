import mongoose from 'mongoose';
import { Category, ICategoryDocument } from '../models/category.model';

export const categoryRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: ICategoryDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Category.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Category.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Category.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Category.create([data], { session }))[0];
  },
  save(category: ICategoryDocument, session: mongoose.ClientSession) {
    return category.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'name' | 'code',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Category.exists({
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

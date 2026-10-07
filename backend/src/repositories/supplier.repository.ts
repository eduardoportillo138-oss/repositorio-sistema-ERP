import mongoose from 'mongoose';
import { Supplier, ISupplierDocument } from '../models/supplier.model';

export const supplierRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: ISupplierDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Supplier.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Supplier.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Supplier.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Supplier.create([data], { session }))[0];
  },
  save(supplier: ISupplierDocument, session: mongoose.ClientSession) {
    return supplier.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'email' | 'taxId',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Supplier.exists({
      companyId,
      status: 'active',
      [field]: value,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .session(session || null)
      .exec();
  },
};

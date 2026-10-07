import mongoose from 'mongoose';
import { Warehouse, IWarehouseDocument } from '../models/warehouse.model';

export const warehouseRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: IWarehouseDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Warehouse.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Warehouse.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Warehouse.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Warehouse.create([data], { session }))[0];
  },
  save(warehouse: IWarehouseDocument, session: mongoose.ClientSession) {
    return warehouse.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'name' | 'code',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Warehouse.exists({
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

import mongoose from 'mongoose';
import { Unit, IUnitDocument } from '../models/unit.model';

export const unitRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: IUnitDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Unit.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Unit.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Unit.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Unit.create([data], { session }))[0];
  },
  save(unit: IUnitDocument, session: mongoose.ClientSession) {
    return unit.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'name' | 'code',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Unit.exists({
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

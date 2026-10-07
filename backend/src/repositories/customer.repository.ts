import mongoose from 'mongoose';
import { Customer, ICustomerDocument } from '../models/customer.model';

export const customerRepository = {
  async list(
    companyId: string,
    filter: Record<string, unknown>,
    skip: number,
    limit: number,
  ): Promise<{ data: ICustomerDocument[]; total: number }> {
    const scoped = { ...filter, companyId };
    const [data, total] = await Promise.all([
      Customer.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Customer.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Customer.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Customer.create([data], { session }))[0];
  },
  save(customer: ICustomerDocument, session: mongoose.ClientSession) {
    return customer.save({ session });
  },
  duplicate(
    companyId: string,
    field: 'email' | 'taxId',
    value: string,
    excludeId?: string,
    session?: mongoose.ClientSession,
  ) {
    return Customer.exists({
      companyId,
      status: 'active',
      [field]: value,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    })
      .session(session || null)
      .exec();
  },
};

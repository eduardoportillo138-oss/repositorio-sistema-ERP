import mongoose from 'mongoose';
import { Employee, IEmployeeDocument } from '../models/employee.model';

export const employeeRepository = {
  async list(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Employee.find(scoped).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).exec(),
      Employee.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Employee.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  duplicate(companyId: string, employeeNumber: string, excludeId?: string,
    session?: mongoose.ClientSession) {
    return Employee.exists({ companyId, employeeNumber,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Employee.create([data], { session }))[0];
  },
  save(employee: IEmployeeDocument, session: mongoose.ClientSession) {
    return employee.save({ session });
  },
};

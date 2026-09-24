import mongoose from 'mongoose';
import { User, IUserDocument } from '../models/user.model';

const activeFilter = { status: { $ne: 'cancelled' } };

export const userRepository = {
  async findByEmail(email: string, companyId?: string): Promise<IUserDocument | null> {
    const filter = { email: email.trim().toLowerCase(), ...activeFilter, ...(companyId ? { companyId } : {}) };
    if (companyId) return User.findOne(filter).select('+passwordHash').exec();
    const matches = await User.find(filter).limit(2).select('+passwordHash').exec();
    return matches.length === 1 ? matches[0] : null;
  },

  findById(userId: string, companyId: string, withPassword = false): Promise<IUserDocument | null> {
    const query = User.findOne({ _id: userId, companyId, ...activeFilter });
    return (withPassword ? query.select('+passwordHash') : query).exec();
  },

  async findByCompany(companyId: string, page: number, limit: number) {
    const filter = { companyId, ...activeFilter };
    const [data, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).exec(),
      User.countDocuments(filter).exec(),
    ]);
    return { data, total };
  },

  create(input: { email: string; name: string; password: string; roleId: string; companyId: string; branchId?: string; actorId: string }) {
    return new User({
      email: input.email.trim().toLowerCase(), name: input.name.trim(), passwordHash: input.password,
      roleId: new mongoose.Types.ObjectId(input.roleId), companyId: new mongoose.Types.ObjectId(input.companyId),
      ...(input.branchId ? { branchId: new mongoose.Types.ObjectId(input.branchId) } : {}),
      permissions: [], createdBy: new mongoose.Types.ObjectId(input.actorId),
    }).save();
  },

  update(userId: string, companyId: string, patch: Partial<Pick<IUserDocument, 'name' | 'phone' | 'roleId' | 'branchId' | 'status'>>) {
    return User.findOneAndUpdate({ _id: userId, companyId, ...activeFilter }, { $set: patch }, { new: true, runValidators: true }).exec();
  },

  deactivate(userId: string, companyId: string) {
    return User.findOneAndUpdate({ _id: userId, companyId, ...activeFilter }, { $set: { status: 'inactive' } }, { new: true }).exec();
  },

  updateLastLogin(userId: string, companyId: string) {
    return User.updateOne({ _id: userId, companyId }, { $set: { lastLoginAt: new Date() } }).exec();
  },
};

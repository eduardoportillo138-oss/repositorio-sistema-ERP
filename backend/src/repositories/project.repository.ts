import mongoose from 'mongoose';
import { Project, IProjectDocument } from '../models/project.model';

export const projectRepository = {
  async list(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Project.find(scoped).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Project.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  get(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Project.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  duplicate(companyId: string, code: string, excludeId?: string,
    session?: mongoose.ClientSession) {
    return Project.exists({ companyId, code,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).session(session || null).exec();
  },
  async create(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Project.create([data], { session }))[0];
  },
  save(project: IProjectDocument, session: mongoose.ClientSession) {
    return project.save({ session });
  },
};

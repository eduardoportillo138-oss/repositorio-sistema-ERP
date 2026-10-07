import mongoose from 'mongoose';
import { Lead, ILeadDocument } from '../models/lead.model';
import { Opportunity, IOpportunityDocument } from '../models/opportunity.model';

export const crmRepository = {
  async listLeads(companyId: string, filter: Record<string, unknown>, skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Lead.find(scoped).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Lead.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  lead(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Lead.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  leadEmail(companyId: string, email: string, excludeId?: string,
    session?: mongoose.ClientSession) {
    return Lead.exists({ companyId, email, status: { $in: ['new', 'qualified'] },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}) }).session(session || null).exec();
  },
  async createLead(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Lead.create([data], { session }))[0];
  },
  saveLead(lead: ILeadDocument, session: mongoose.ClientSession) {
    return lead.save({ session });
  },
  async listOpportunities(companyId: string, filter: Record<string, unknown>,
    skip: number, limit: number) {
    const scoped = { companyId, ...filter };
    const [data, total] = await Promise.all([
      Opportunity.find(scoped).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Opportunity.countDocuments(scoped).exec(),
    ]);
    return { data, total };
  },
  opportunity(companyId: string, id: string, session?: mongoose.ClientSession) {
    return Opportunity.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  async createOpportunity(data: Record<string, unknown>, session: mongoose.ClientSession) {
    return (await Opportunity.create([data], { session }))[0];
  },
  saveOpportunity(opportunity: IOpportunityDocument, session: mongoose.ClientSession) {
    return opportunity.save({ session });
  },
};

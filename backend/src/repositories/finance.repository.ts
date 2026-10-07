import mongoose from 'mongoose';
import { AccountsReceivable } from '../models/accountsReceivable.model';
import { AccountsPayable } from '../models/accountsPayable.model';
import { Payment } from '../models/payment.model';

export const financeRepository = {
  receivable(companyId: string, id: string, session?: mongoose.ClientSession) {
    return AccountsReceivable.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  payable(companyId: string, id: string, session?: mongoose.ClientSession) {
    return AccountsPayable.findOne({ _id: id, companyId }).session(session || null).exec();
  },
  saleAccount(companyId: string, saleId: string, session: mongoose.ClientSession) {
    return AccountsReceivable.findOne({ companyId, saleId }).session(session).exec();
  },
  purchaseAccount(companyId: string, purchaseId: string, session: mongoose.ClientSession) {
    return AccountsPayable.findOne({ companyId, purchaseId }).session(session).exec();
  },
  async listAccounts(kind: 'receivable' | 'payable', companyId: string,
    status: string | undefined, skip: number, limit: number) {
    const filter = { companyId, ...(status ? { status } : {}) };
    if (kind === 'receivable') {
      const [data, total] = await Promise.all([
        AccountsReceivable.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
        AccountsReceivable.countDocuments(filter).exec(),
      ]);
      return { data, total };
    }
    const [data, total] = await Promise.all([
      AccountsPayable.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      AccountsPayable.countDocuments(filter).exec(),
    ]);
    return { data, total };
  },
  async listPayments(companyId: string, skip: number, limit: number,
    accountType?: string, accountId?: string) {
    const filter = { companyId, ...(accountType ? { accountType } : {}),
      ...(accountId ? { accountId } : {}) };
    const [data, total] = await Promise.all([
      Payment.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).exec(),
      Payment.countDocuments(filter).exec(),
    ]);
    return { data, total };
  },
};

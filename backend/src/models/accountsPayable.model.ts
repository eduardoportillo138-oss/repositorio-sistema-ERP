import mongoose, { Document, Schema } from 'mongoose';
import { AccountStatus } from './accountsReceivable.model';

export interface IAccountsPayableDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  purchaseId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAccountsPayableDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  purchaseId: { type: Schema.Types.ObjectId, ref: 'Purchase', required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  paidMinor: { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger },
  balanceMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  status: { type: String, required: true,
    enum: ['pending', 'partial', 'paid', 'cancelled'], default: 'pending' },
}, { timestamps: true, collection: 'accountsPayable', optimisticConcurrency: true });
schema.index({ companyId: 1, purchaseId: 1 }, { unique: true, partialFilterExpression: { purchaseId: { $exists: true } } });
schema.index({ companyId: 1, status: 1, createdAt: -1 });
schema.index({ companyId: 1, supplierId: 1 });
export const AccountsPayable = mongoose.model<IAccountsPayableDocument>('AccountsPayable', schema);

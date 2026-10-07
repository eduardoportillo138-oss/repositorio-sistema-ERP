import mongoose, { Document, Schema } from 'mongoose';

export type AccountStatus = 'pending' | 'partial' | 'paid' | 'cancelled';
export interface IAccountsReceivableDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  saleId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amountMinor: number;
  paidMinor: number;
  balanceMinor: number;
  status: AccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IAccountsReceivableDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  saleId: { type: Schema.Types.ObjectId, ref: 'Sale', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  paidMinor: { type: Number, required: true, default: 0, min: 0, validate: Number.isSafeInteger },
  balanceMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  status: { type: String, required: true,
    enum: ['pending', 'partial', 'paid', 'cancelled'], default: 'pending' },
}, { timestamps: true, collection: 'accountsReceivable', optimisticConcurrency: true });
schema.index({ companyId: 1, saleId: 1 }, { unique: true, partialFilterExpression: { saleId: { $exists: true } } });
schema.index({ companyId: 1, status: 1, createdAt: -1 });
schema.index({ companyId: 1, customerId: 1 });
export const AccountsReceivable = mongoose.model<IAccountsReceivableDocument>('AccountsReceivable', schema);

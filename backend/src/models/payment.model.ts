import mongoose, { Document, Schema } from 'mongoose';

export interface IPaymentDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  accountType: 'receivable' | 'payable';
  accountId: mongoose.Types.ObjectId;
  amountMinor: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IPaymentDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  accountType: { type: String, required: true, enum: ['receivable', 'payable'] },
  accountId: { type: Schema.Types.ObjectId, required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  paymentMethod: { type: String, required: true, trim: true, maxlength: 60 },
  reference: { type: String, trim: true, maxlength: 120 },
  notes: { type: String, trim: true, maxlength: 500 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'payments' });
schema.index({ companyId: 1, accountType: 1, accountId: 1, createdAt: -1 });
schema.index({ companyId: 1, createdAt: -1 });
export const Payment = mongoose.model<IPaymentDocument>('Payment', schema);

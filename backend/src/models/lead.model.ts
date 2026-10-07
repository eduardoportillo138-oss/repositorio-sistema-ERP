import mongoose, { Document, Schema } from 'mongoose';

export interface ILeadDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  source: string;
  status: 'new' | 'qualified' | 'inactive';
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ILeadDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  companyName: { type: String, trim: true, maxlength: 200 },
  email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 30 },
  source: { type: String, required: true, trim: true, maxlength: 100 },
  status: { type: String, enum: ['new', 'qualified', 'inactive'], default: 'new' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'leads' });
schema.index({ companyId: 1, status: 1, createdAt: -1 });
schema.index({ companyId: 1, assignedTo: 1 });
schema.index({ companyId: 1, email: 1 }, { unique: true,
  partialFilterExpression: { email: { $type: 'string' },
    status: { $in: ['new', 'qualified'] } } });
export const Lead = mongoose.model<ILeadDocument>('Lead', schema);

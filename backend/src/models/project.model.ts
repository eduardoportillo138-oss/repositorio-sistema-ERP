import mongoose, { Document, Schema } from 'mongoose';

export interface IProjectDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  startDate: Date;
  endDate?: Date;
  budgetMinor?: number;
  ownerUserId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IProjectDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  code: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, trim: true, maxlength: 1000 },
  status: { type: String, enum: ['planned', 'active', 'completed', 'cancelled'],
    default: 'planned' },
  startDate: { type: Date, required: true },
  endDate: Date,
  budgetMinor: { type: Number, min: 0, validate: Number.isSafeInteger },
  ownerUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'projects' });
schema.index({ companyId: 1, code: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true }, code: { $exists: true } } });
schema.index({ companyId: 1, status: 1, createdAt: -1 });
schema.index({ companyId: 1, ownerUserId: 1 });
export const Project = mongoose.model<IProjectDocument>('Project', schema);

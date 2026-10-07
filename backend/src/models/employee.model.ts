import mongoose, { Document, Schema } from 'mongoose';

export interface IEmployeeDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  employeeNumber: string;
  name: string;
  email: string;
  phone?: string;
  position: string;
  department: string;
  hireDate: Date;
  status: 'active' | 'inactive';
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IEmployeeDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  employeeNumber: { type: String, required: true, trim: true, uppercase: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 200 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 30 },
  position: { type: String, required: true, trim: true, maxlength: 100 },
  department: { type: String, required: true, trim: true, maxlength: 100 },
  hireDate: { type: Date, required: true },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'employees' });
schema.index({ companyId: 1, employeeNumber: 1 },
  { unique: true, partialFilterExpression: { companyId: { $exists: true }, employeeNumber: { $exists: true } } });
schema.index({ companyId: 1, status: 1, createdAt: -1 });
schema.index({ companyId: 1, branchId: 1 });
schema.index({ companyId: 1, email: 1 });
export const Employee = mongoose.model<IEmployeeDocument>('Employee', schema);

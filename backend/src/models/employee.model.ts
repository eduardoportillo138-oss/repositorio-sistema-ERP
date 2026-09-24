// ============================================
// Modelo de Empleado
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IEmployee extends BaseDocument {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  position?: string;
  department?: string;
  hireDate: Date;
  salary?: number;
  status: DocumentStatus;
  userId?: mongoose.Types.ObjectId;
}

export interface IEmployeeDocument extends IEmployee, Document {}

const employeeSchema = new Schema<IEmployeeDocument>(
  {
    firstName: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    lastName: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: { type: String, trim: true, maxlength: 20 },
    documentType: { type: String, trim: true },
    documentNumber: { type: String, trim: true },
    position: { type: String, trim: true, maxlength: 100 },
    department: { type: String, trim: true, maxlength: 100 },
    hireDate: { type: Date, required: true },
    salary: { type: Number, min: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'employees' }
);

employeeSchema.index({ companyId: 1, email: 1 });
employeeSchema.index({ companyId: 1, department: 1 });
employeeSchema.index({ companyId: 1, status: 1 });

export const Employee = mongoose.model<IEmployeeDocument>('Employee', employeeSchema);

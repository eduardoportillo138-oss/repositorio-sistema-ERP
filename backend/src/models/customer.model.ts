// ============================================
// Modelo de Cliente
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface ICustomer extends BaseDocument {
  name: string;
  email?: string;
  phone?: string;
  fiscalName?: string;
  taxId?: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  notes?: string;
  creditLimit?: number;
  balance?: number;
  status: DocumentStatus;
  tags?: string[];
}

export interface ICustomerDocument extends ICustomer, Document {}

const customerSchema = new Schema<ICustomerDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del cliente es obligatorio'],
      trim: true,
      maxlength: 200,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    fiscalName: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    taxId: {
      type: String,
      trim: true,
      index: true,
    },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    notes: { type: String, trim: true, maxlength: 1000 },
    creditLimit: { type: Number, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
    tags: [{ type: String }],
  },
  { timestamps: true, collection: 'customers' }
);

customerSchema.index({ companyId: 1, name: 1 });
customerSchema.index({ companyId: 1, status: 1 });
customerSchema.index({ email: 1, companyId: 1 });

export const Customer = mongoose.model<ICustomerDocument>('Customer', customerSchema);

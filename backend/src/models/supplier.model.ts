// ============================================
// Modelo de Proveedor
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface ISupplier extends BaseDocument {
  name: string;
  email?: string;
  phone?: string;
  contactName?: string;
  taxId?: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  paymentTerms: string;
  notes?: string;
  status: DocumentStatus;
}

export interface ISupplierDocument extends ISupplier, Document {}

const supplierSchema = new Schema<ISupplierDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proveedor es obligatorio'],
      trim: true,
      maxlength: 200,
      index: true,
    },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true, maxlength: 20 },
    contactName: { type: String, trim: true, maxlength: 200 },
    taxId: { type: String, trim: true, index: true },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    postalCode: { type: String, trim: true, maxlength: 20 },
    paymentTerms: { type: String, default: '30 días' },
    notes: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'suppliers' }
);

supplierSchema.index({ companyId: 1, name: 1 });
supplierSchema.index({ companyId: 1, status: 1 });

export const Supplier = mongoose.model<ISupplierDocument>('Supplier', supplierSchema);

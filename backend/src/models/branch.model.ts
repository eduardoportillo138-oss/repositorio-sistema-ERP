// ============================================
// Modelo de Sucursal
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IBranch extends BaseDocument {
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email?: string;
  isMain: boolean;
  status: DocumentStatus;
}

export interface IBranchDocument extends IBranch, Document {}

const branchSchema = new Schema<IBranchDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la sucursal es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    address: { type: String, trim: true, required: true, maxlength: 500 },
    city: { type: String, trim: true, required: true, maxlength: 100 },
    country: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, trim: true, maxlength: 20 },
    email: { type: String, trim: true, lowercase: true },
    isMain: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'branches' }
);

branchSchema.index({ companyId: 1, code: 1 }, { unique: true });
branchSchema.index({ companyId: 1, isMain: 1 });

export const Branch = mongoose.model<IBranchDocument>('Branch', branchSchema);

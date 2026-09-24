// ============================================
// Modelo de Empresa
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface ICompany extends BaseDocument {
  name: string;
  legalName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  currency: string;
  timezone: string;
  logo?: string;
  status: DocumentStatus;
}

export interface ICompanyDocument extends ICompany, Document {}

const companySchema = new Schema<ICompanyDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la empresa es obligatorio'],
      trim: true,
      maxlength: 200,
      index: true,
    },
    legalName: {
      type: String,
      required: [true, 'El nombre legal es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    taxId: {
      type: String,
      required: [true, 'El ID fiscal es obligatorio'],
      trim: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    currency: {
      type: String,
      required: [true, 'La moneda es obligatoria'],
      default: 'USD',
      maxlength: 3,
    },
    timezone: {
      type: String,
      default: 'America/Mexico_City',
    },
    logo: {
      type: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'companies',
  }
);

// Índices
companySchema.index({ taxId: 1 }, { unique: true });
companySchema.index({ name: 1, status: 1 });
companySchema.index({ status: 1, createdAt: -1 });

export const Company = mongoose.model<ICompanyDocument>('Company', companySchema);

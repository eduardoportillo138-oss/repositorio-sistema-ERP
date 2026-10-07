// ============================================
// Modelo de Producto
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IProduct extends BaseDocument {
  companyId: mongoose.Types.ObjectId;
  code: string;
  name: string;
  description?: string;
  categoryId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  /** Legacy decimal price. New writes use priceMinor. */
  unitPrice?: number;
  costPrice?: number;
  taxRate?: number;
  priceMinor?: number;
  costMinor?: number;
  taxRateBps?: number;
  /** Legacy value; inventory movements are authoritative. */
  stockCurrent?: number;
  stockMinimum: number;
  stockMaximum?: number;
  barcode?: string;
  sku?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    unit: string;
  };
  isActive: boolean;
  hasImage: boolean;
  status: DocumentStatus;
}

export interface IProductDocument extends IProduct, Document {}

const productSchema = new Schema<IProductDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    code: {
      type: String,
      required: [true, 'El código del producto es obligatorio'],
      trim: true,
      maxlength: 50,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre del producto es obligatorio'],
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'La categoría es obligatoria'],
      index: true,
    },
    unitId: {
      type: Schema.Types.ObjectId,
      ref: 'Unit',
      required: [true, 'La unidad es obligatoria'],
    },
    unitPrice: { type: Number, min: 0 },
    costPrice: {
      type: Number,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    priceMinor: { type: Number, min: 0, validate: Number.isSafeInteger },
    costMinor: { type: Number, min: 0, validate: Number.isSafeInteger },
    taxRateBps: { type: Number, default: 0, min: 0, max: 10000,
      validate: Number.isSafeInteger },
    stockCurrent: {
      type: Number,
      min: 0,
    },
    stockMinimum: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    stockMaximum: {
      type: Number,
      min: 0,
    },
    barcode: { type: String, trim: true },
    sku: { type: String, trim: true },
    weight: { type: Number, min: 0 },
    dimensions: {
      length: { type: Number, min: 0 },
      width: { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      unit: { type: String },
    },
    isActive: { type: Boolean, default: true },
    hasImage: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'products' },
);

// Índices compuestos para consultas de inventario
productSchema.index({ companyId: 1, code: 1 }, { unique: true });
productSchema.index({ companyId: 1, categoryId: 1 });
productSchema.index({ companyId: 1, status: 1, name: 1 });
productSchema.index({ companyId: 1, sku: 1 },
  { unique: true, partialFilterExpression: { sku: { $type: 'string' } } });
productSchema.index({ companyId: 1, barcode: 1 },
  { unique: true, partialFilterExpression: { barcode: { $type: 'string' } } });

export const Product = mongoose.model<IProductDocument>('Product', productSchema);

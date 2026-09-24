// ============================================
// Modelo de Producto
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IProduct extends BaseDocument {
  code: string;
  name: string;
  description?: string;
  categoryId: mongoose.Types.ObjectId;
  unitId: mongoose.Types.ObjectId;
  unitPrice: number;
  costPrice?: number;
  taxRate?: number;
  stockCurrent: number;
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
    unitPrice: {
      type: Number,
      required: [true, 'El precio unitario es obligatorio'],
      min: 0,
    },
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
    stockCurrent: {
      type: Number,
      required: true,
      default: 0,
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
    barcode: { type: String, trim: true, unique: true },
    sku: { type: String, trim: true, unique: true },
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
  { timestamps: true, collection: 'products' }
);

// Índices compuestos para consultas de inventario
productSchema.index({ companyId: 1, code: 1 }, { unique: true });
productSchema.index({ companyId: 1, categoryId: 1 });
productSchema.index({ companyId: 1, status: 1, name: 1 });
productSchema.index({ sku: 1, companyId: 1 }, { unique: true });

export const Product = mongoose.model<IProductDocument>('Product', productSchema);

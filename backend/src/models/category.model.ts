// ============================================
// Modelo de Categoría
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface ICategory extends BaseDocument {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  level: number;
  status: DocumentStatus;
}

export interface ICategoryDocument extends ICategory, Document {}

const categorySchema = new Schema<ICategoryDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 500 },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    level: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'categories' }
);

categorySchema.index({ companyId: 1, code: 1 }, { unique: true });
categorySchema.index({ companyId: 1, parentId: 1 });
categorySchema.index({ parentId: 1, level: 1 });

export const Category = mongoose.model<ICategoryDocument>('Category', categorySchema);

// ============================================
// Modelo de Unidad de Medida
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument } from '../../packages/types/src';

export interface IUnit extends BaseDocument {
  name: string;
  code: string;
  symbol: string;
  description?: string;
}

export interface IUnitDocument extends IUnit, Document {}

const unitSchema = new Schema<IUnitDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10,
    },
    description: { type: String, trim: true, maxlength: 500 },
  },
  { timestamps: true, collection: 'units' }
);

unitSchema.index({ companyId: 1, code: 1 }, { unique: true });

export const Unit = mongoose.model<IUnitDocument>('Unit', unitSchema);

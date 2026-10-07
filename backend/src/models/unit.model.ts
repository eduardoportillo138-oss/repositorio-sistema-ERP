// ============================================
// Modelo de Unidad de Medida
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument } from '../../../packages/types/dist';

export interface IUnit extends BaseDocument {
  companyId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  symbol: string;
  description?: string;
  status: 'active' | 'inactive';
}

export interface IUnitDocument extends IUnit, Document {}

const unitSchema = new Schema<IUnitDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
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
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  { timestamps: true, collection: 'units' },
);

unitSchema.index({ companyId: 1, code: 1 }, { unique: true });
unitSchema.index({ companyId: 1, status: 1, name: 1 });

export const Unit = mongoose.model<IUnitDocument>('Unit', unitSchema);

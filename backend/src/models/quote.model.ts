// ============================================
// Modelo de Cotización
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IQuote extends BaseDocument {
  customerId: string;
  items: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  validUntil?: Date;
  notes?: string;
}

export interface IQuoteDocument extends IQuote, Document {}

const quoteSchema = new Schema<IQuoteDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'El cliente es obligatorio'],
    },
    items: [{
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      name: { type: String, required: true },
      quantity: { type: Number, required: true, min: 0 },
      unitPrice: { type: Number, required: true, min: 0 },
      total: { type: Number, required: true, min: 0 },
    }],
    subtotal: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    validUntil: { type: Date },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'quotes' }
);

quoteSchema.index({ companyId: 1, customerId: 1, status: 1 });
quoteSchema.index({ companyId: 1, createdAt: -1 });

export const Quote = mongoose.model<IQuoteDocument>('Quote', quoteSchema);

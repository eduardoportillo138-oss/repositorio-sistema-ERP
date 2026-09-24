// ============================================
// Modelo de Factura
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IInvoice extends BaseDocument {
  saleId?: string;
  customerId: string;
  invoiceNumber: string;
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
  paidAmount: number;
  balance: number;
  paymentMethod?: string;
  dueDate?: Date;
  notes?: string;
}

export interface IInvoiceDocument extends IInvoice, Document {}

const invoiceSchema = new Schema<IInvoiceDocument>(
  {
    saleId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'El cliente es obligatorio'],
    },
    invoiceNumber: {
      type: String,
      required: [true, 'El número de factura es obligatorio'],
      trim: true,
      index: true,
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
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, trim: true },
    dueDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'invoices' }
);

invoiceSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ companyId: 1, customerId: 1, status: 1 });
invoiceSchema.index({ companyId: 1, status: 1, createdAt: -1 });

export const Invoice = mongoose.model<IInvoiceDocument>('Invoice', invoiceSchema);

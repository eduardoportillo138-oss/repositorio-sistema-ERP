// ============================================
// Modelo de Orden de Venta
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface ISalesOrder extends BaseDocument {
  customerId: mongoose.Types.ObjectId;
  quoteId?: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  discountAmount?: number;
  notes?: string;
}

export interface ISalesOrderDocument extends ISalesOrder, Document {}

const salesOrderSchema = new Schema<ISalesOrderDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'El cliente es obligatorio'],
    },
    quoteId: { type: Schema.Types.ObjectId, ref: 'Quote' },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'El almacén es obligatorio'],
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
    discountAmount: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'salesOrders' }
);

salesOrderSchema.index({ companyId: 1, customerId: 1, status: 1 });
salesOrderSchema.index({ companyId: 1, createdAt: -1 });
salesOrderSchema.index({ companyId: 1, warehouseId: 1, status: 1 });

export const SalesOrder = mongoose.model<ISalesOrderDocument>('SalesOrder', salesOrderSchema);

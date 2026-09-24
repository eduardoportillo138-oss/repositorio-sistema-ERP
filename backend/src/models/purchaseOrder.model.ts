// ============================================
// Modelo de Orden de Compra
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IPurchaseOrder extends BaseDocument {
  supplierId: string;
  warehouseId: string;
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
  notes?: string;
}

export interface IPurchaseOrderDocument extends IPurchaseOrder, Document {}

const purchaseOrderSchema = new Schema<IPurchaseOrderDocument>(
  {
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'El proveedor es obligatorio'],
    },
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
    notes: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true, collection: 'purchaseOrders' }
);

purchaseOrderSchema.index({ companyId: 1, supplierId: 1, status: 1 });
purchaseOrderSchema.index({ companyId: 1, createdAt: -1 });
purchaseOrderSchema.index({ companyId: 1, warehouseId: 1, status: 1 });

export const PurchaseOrder = mongoose.model<IPurchaseOrderDocument>('PurchaseOrder', purchaseOrderSchema);

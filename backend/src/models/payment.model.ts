// ============================================
// Modelo de Pago
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IPayment extends BaseDocument {
  invoiceId?: string;
  purchaseOrderId?: string;
  customerId?: string;
  supplierId?: string;
  amount: number;
  paymentMethod: string;
  reference?: string;
  notes?: string;
  status: DocumentStatus;
}

export interface IPaymentDocument extends IPayment, Document {}

const paymentSchema = new Schema<IPaymentDocument>(
  {
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    purchaseOrderId: { type: Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
    supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier' },
    amount: { type: Number, required: [true, 'El monto es obligatorio'], min: 0 },
    paymentMethod: { type: String, required: true, trim: true },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'payments' }
);

paymentSchema.index({ companyId: 1, invoiceId: 1 });
paymentSchema.index({ companyId: 1, customerId: 1 });
paymentSchema.index({ companyId: 1, supplierId: 1 });
paymentSchema.index({ companyId: 1, createdAt: -1 });

export const Payment = mongoose.model<IPaymentDocument>('Payment', paymentSchema);

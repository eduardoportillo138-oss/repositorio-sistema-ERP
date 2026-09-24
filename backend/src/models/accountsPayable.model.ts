// ============================================
// Modelo de Cuentas por Pagar
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IAccountsPayable extends BaseDocument {
  purchaseOrderId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  invoiceId?: mongoose.Types.ObjectId;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: Date;
  status: DocumentStatus;
}

export interface IAccountsPayableDocument extends IAccountsPayable, Document {}

const accountsPayableSchema = new Schema<IAccountsPayableDocument>(
  {
    purchaseOrderId: {
      type: Schema.Types.ObjectId,
      ref: 'PurchaseOrder',
      required: [true, 'La orden de compra es obligatoria'],
    },
    supplierId: {
      type: Schema.Types.ObjectId,
      ref: 'Supplier',
      required: [true, 'El proveedor es obligatorio'],
    },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    amount: { type: Number, required: [true, 'El monto es obligatorio'], min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balance: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'overdue', 'paid'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'accountsPayable' }
);

accountsPayableSchema.index({ companyId: 1, supplierId: 1, status: 1 });
accountsPayableSchema.index({ companyId: 1, dueDate: 1 });
accountsPayableSchema.index({ companyId: 1, status: 1, balance: 1 });

export const AccountsPayable = mongoose.model<IAccountsPayableDocument>('AccountsPayable', accountsPayableSchema);

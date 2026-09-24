// ============================================
// Modelo de Cuentas por Cobrar
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IAccountsReceivable extends BaseDocument {
  invoiceId: string;
  customerId: string;
  saleId?: string;
  amount: number;
  paidAmount: number;
  balance: number;
  dueDate: Date;
  status: DocumentStatus;
}

export interface IAccountsReceivableDocument extends IAccountsReceivable, Document {}

const accountsReceivableSchema = new Schema<IAccountsReceivableDocument>(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: 'Invoice',
      required: [true, 'La factura es obligatoria'],
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'El cliente es obligatorio'],
    },
    saleId: { type: Schema.Types.ObjectId, ref: 'SalesOrder' },
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
  { timestamps: true, collection: 'accountsReceivable' }
);

accountsReceivableSchema.index({ companyId: 1, customerId: 1, status: 1 });
accountsReceivableSchema.index({ companyId: 1, dueDate: 1 });
accountsReceivableSchema.index({ companyId: 1, status: 1, balance: 1 });

export const AccountsReceivable = mongoose.model<IAccountsReceivableDocument>('AccountsReceivable', accountsReceivableSchema);

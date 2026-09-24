// ============================================
// Modelo de Movimientos de Inventario
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export type MovementType = 'entry' | 'exit' | 'transfer' | 'adjustment' | 'return';

export interface IInventoryMovement extends BaseDocument {
  productId: string;
  companyId: string;
  branchId?: string;
  warehouseId: string;
  type: MovementType;
  quantity: number;
  unitPrice?: number;
  referenceType?: string;
  referenceId?: string;
  reason: string;
  notes?: string;
  createdBy: string;
  status: DocumentStatus;
  createdAt: Date;
}

export interface IInventoryMovementDocument extends IInventoryMovement, Document {}

const inventoryMovementSchema = new Schema<IInventoryMovementDocument>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'El producto es obligatorio'],
      index: true,
    },
    companyId: {
      type: String,
      required: [true, 'El companyId es obligatorio'],
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: [true, 'El almacén es obligatorio'],
      index: true,
    },
    type: {
      type: String,
      enum: ['entry', 'exit', 'transfer', 'adjustment', 'return'],
      required: [true, 'El tipo de movimiento es obligatorio'],
      index: true,
    },
    quantity: {
      type: Number,
      required: [true, 'La cantidad es obligatoria'],
    },
    unitPrice: {
      type: Number,
      min: 0,
    },
    referenceType: {
      type: String,
      enum: ['salesOrder', 'purchaseOrder', 'invoice', 'transferOrder', 'adjustment', 'manual'],
    },
    referenceId: {
      type: String,
      index: true,
    },
    reason: {
      type: String,
      required: [true, 'El motivo es obligatorio'],
      trim: true,
      maxlength: 500,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    createdBy: {
      type: String,
      required: [true, 'El creador es obligatorio'],
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed',
      index: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'inventoryMovements',
  }
);

// Índices compuestos
inventoryMovementSchema.index({ companyId: 1, productId: 1, type: 1, createdAt: -1 });
inventoryMovementSchema.index({ companyId: 1, warehouseId: 1, createdAt: -1 });
inventoryMovementSchema.index({ referenceType: 1, referenceId: 1 });
inventoryMovementSchema.index({ productId: 1, warehouseId: 1, createdAt: -1 });

export const InventoryMovement = mongoose.model<IInventoryMovementDocument>('InventoryMovement', inventoryMovementSchema);

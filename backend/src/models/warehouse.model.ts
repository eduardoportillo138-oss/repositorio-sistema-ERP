// ============================================
// Modelo de Almacén
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IWarehouse extends BaseDocument {
  companyId: mongoose.Types.ObjectId;
  branchId?: mongoose.Types.ObjectId;
  name: string;
  code: string;
  location?: string;
  address?: string;
  city?: string;
  country?: string;
  capacity?: number;
  currentOccupancy?: number;
  isDefault: boolean;
  status: DocumentStatus;
}

export interface IWarehouseDocument extends IWarehouse, Document {}

const warehouseSchema = new Schema<IWarehouseDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    branchId: { type: Schema.Types.ObjectId, ref: 'Branch' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      maxlength: 20,
      index: true,
    },
    location: { type: String, trim: true, maxlength: 500 },
    address: { type: String, trim: true, maxlength: 500 },
    city: { type: String, trim: true, maxlength: 100 },
    country: { type: String, trim: true, maxlength: 100 },
    capacity: { type: Number, min: 0 },
    currentOccupancy: { type: Number, default: 0, min: 0 },
    isDefault: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  { timestamps: true, collection: 'warehouses' },
);

warehouseSchema.index({ companyId: 1, code: 1 }, { unique: true });
warehouseSchema.index({ companyId: 1, status: 1, name: 1 });
warehouseSchema.index({ companyId: 1, branchId: 1 });
warehouseSchema.index({ companyId: 1, isDefault: 1 });

export const Warehouse = mongoose.model<IWarehouseDocument>('Warehouse', warehouseSchema);

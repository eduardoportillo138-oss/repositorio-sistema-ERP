// ============================================
// Modelo de Rol
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, Permission, DocumentStatus } from '../../packages/types/src';

export interface IRole extends BaseDocument {
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  status: DocumentStatus;
}

export interface IRoleDocument extends IRole, Document {}

const roleSchema = new Schema<IRoleDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del rol es obligatorio'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    permissions: {
      type: [String],
      default: [],
    },
    isSystemRole: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'roles',
  }
);

// Índices
roleSchema.index({ name: 1, companyId: 1 }, { unique: true });
roleSchema.index({ companyId: 1, isSystemRole: 1 });
roleSchema.index({ permissions: 1 });

export const Role = mongoose.model<IRoleDocument>('Role', roleSchema);

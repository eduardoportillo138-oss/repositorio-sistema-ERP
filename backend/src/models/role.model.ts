// ============================================
// Modelo de Rol
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { PERMISSIONS } from '../../../packages/types/dist';
import type { BaseDocument, Permission, DocumentStatus } from '../../../packages/types/dist';

export interface IRole extends BaseDocument {
  companyId: mongoose.Types.ObjectId;
  name: string;
  description: string;
  permissions: Permission[];
  isSystemRole: boolean;
  status: DocumentStatus;
}

export interface IRoleDocument extends IRole, Document {}

const roleSchema = new Schema<IRoleDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
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
      enum: [...PERMISSIONS],
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

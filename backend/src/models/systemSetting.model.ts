// ============================================
// Modelo de Configuración del Sistema
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface ISystemSetting extends BaseDocument {
  companyId: mongoose.Types.ObjectId;
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  isSystem: boolean;
}

export interface ISystemSettingDocument extends ISystemSetting, Document {}

const systemSettingSchema = new Schema<ISystemSettingDocument>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    key: {
      type: String,
      required: [true, 'La clave es obligatoria'],
      trim: true,
      maxlength: 100,
      index: true,
    },
    value: {
      type: Schema.Types.Mixed,
      required: true,
    },
    type: {
      type: String,
      enum: ['string', 'number', 'boolean', 'json'],
      default: 'string',
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    isSystem: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true, collection: 'systemSettings' },
);

systemSettingSchema.index({ companyId: 1, key: 1 }, {
  name: 'companyId_1_key_1_tenant_unique', unique: true,
  partialFilterExpression: { companyId: { $exists: true } },
});
systemSettingSchema.index({ isSystem: 1 });

export const SystemSetting = mongoose.model<ISystemSettingDocument>(
  'SystemSetting',
  systemSettingSchema,
);

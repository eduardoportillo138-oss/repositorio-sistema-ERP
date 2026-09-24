// ============================================
// Modelo de Auditoría
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IAuditLog extends BaseDocument {
  userId: string;
  companyId: string;
  module: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ip: string;
  device: string;
  timestamp: Date;
}

export interface IAuditLogDocument extends IAuditLog, Document {}

const auditLogSchema = new Schema<IAuditLogDocument>(
  {
    userId: {
      type: String,
      required: [true, 'El userId es obligatorio'],
      index: true,
    },
    companyId: {
      type: String,
      required: [true, 'El companyId es obligatorio'],
      index: true,
    },
    module: {
      type: String,
      required: [true, 'El módulo es obligatorio'],
      trim: true,
      index: true,
    },
    action: {
      type: String,
      required: [true, 'La acción es obligatoria'],
      trim: true,
      index: true,
    },
    entity: {
      type: String,
      required: [true, 'La entidad es obligatoria'],
      trim: true,
      index: true,
    },
    entityId: {
      type: String,
      required: [true, 'El entityId es obligatorio'],
      index: true,
    },
    oldValue: {
      type: Schema.Types.Mixed,
    },
    newValue: {
      type: Schema.Types.Mixed,
    },
    ip: {
      type: String,
      required: [true, 'La IP es obligatoria'],
    },
    device: {
      type: String,
      required: [true, 'El dispositivo es obligatorio'],
    },
    timestamp: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'auditLogs',
  }
);

// Índices compuestos para consultas eficientes
auditLogSchema.index({ companyId: 1, module: 1, timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entity: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, action: 1, timestamp: -1 });

// TTL para logs antiguos (opcional, 7 años)
auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 7 });

export const AuditLog = mongoose.model<IAuditLogDocument>('AuditLog', auditLogSchema);

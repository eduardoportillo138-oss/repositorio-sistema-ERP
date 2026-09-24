// ============================================
// Modelo de Notificación
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface INotification extends BaseDocument {
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  relatedEntity?: string;
  relatedEntityId?: string;
}

export interface INotificationDocument extends INotification, Document {}

const notificationSchema = new Schema<INotificationDocument>(
  {
    userId: {
      type: String,
      required: [true, 'El userId es obligatorio'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'El título es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: [true, 'El mensaje es obligatorio'],
      trim: true,
      maxlength: 1000,
    },
    type: {
      type: String,
      enum: ['info', 'warning', 'error', 'success'],
      default: 'info',
      index: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    relatedEntity: { type: String, trim: true },
    relatedEntityId: { type: String },
  },
  { timestamps: true, collection: 'notifications' }
);

notificationSchema.index({ userId: 1, read: 1 });
notificationSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const Notification = mongoose.model<INotificationDocument>('Notification', notificationSchema);

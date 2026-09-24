// ============================================
// Modelo de Proyecto
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import { BaseDocument, DocumentStatus } from '../../../packages/types/dist';

export interface IProject extends BaseDocument {
  name: string;
  code: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: DocumentStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  budget?: number;
  spent?: number;
}

export interface IProjectDocument extends IProject, Document {}

const projectSchema = new Schema<IProjectDocument>(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 200,
    },
    code: { type: String, trim: true, maxlength: 20, index: true },
    description: { type: String, trim: true, maxlength: 1000 },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled', 'completed', 'on_hold'],
      default: 'active',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    budget: { type: Number, min: 0 },
    spent: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: 'projects' }
);

projectSchema.index({ companyId: 1, code: 1 }, { unique: true });
projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, priority: 1 });

export const Project = mongoose.model<IProjectDocument>('Project', projectSchema);

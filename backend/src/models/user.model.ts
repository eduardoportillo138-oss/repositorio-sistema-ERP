// ============================================
// Modelo de Usuario
// ============================================

import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';
import { BaseDocument, DocumentStatus } from '../../packages/types/src';

export interface IUser extends BaseDocument {
  email: string;
  name: string;
  passwordHash: string;
  roleId: string;
  companyId: string;
  branchId?: string;
  phone?: string;
  status: DocumentStatus;
  lastLoginAt?: Date;
  mfaEnabled?: boolean;
  mfaSecret?: string;
  refreshTokens?: string[];
  permissions: string[];
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: 100,
    },
    passwordHash: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      select: false,
    },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: [true, 'El rol es obligatorio'],
    },
    companyId: {
      type: Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'La empresa es obligatoria'],
      index: true,
    },
    branchId: {
      type: Schema.Types.ObjectId,
      ref: 'Branch',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'cancelled'],
      default: 'active',
      index: true,
    },
    lastLoginAt: {
      type: Date,
    },
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
    mfaSecret: {
      type: String,
      select: false,
    },
    refreshTokens: [
      {
        token: String,
        expiresAt: Date,
      },
    ],
    permissions: [
      {
        type: String,
        enum: [
          'users.view', 'users.create', 'users.edit', 'users.delete',
          'companies.view', 'companies.create', 'companies.edit',
          'customers.view', 'customers.create', 'customers.edit',
          'suppliers.view', 'suppliers.create', 'suppliers.edit',
          'products.view', 'products.create', 'products.edit',
          'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.adjust',
          'sales.view', 'sales.create', 'sales.edit', 'sales.approve',
          'purchases.view', 'purchases.create', 'purchases.edit', 'purchases.approve',
          'finances.view', 'finances.create', 'finances.edit', 'finances.approve',
          'reports.view', 'reports.export',
          'audit.view',
          'settings.view', 'settings.edit',
          'notifications.view', 'notifications.read',
        ],
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'users',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Índices compuestos
userSchema.index({ companyId: 1, email: 1 }, { unique: true });
userSchema.index({ companyId: 1, status: 1 });
userSchema.index({ companyId: 1, roleId: 1 });

// Método para comparar contraseña
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Pre-save para hash de contraseña
userSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

export const User = mongoose.model<IUserDocument>('User', userSchema);

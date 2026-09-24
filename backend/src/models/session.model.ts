import mongoose, { Document, Schema } from 'mongoose';

export interface ISessionDocument extends Document {
  tokenHash: string;
  userId: mongoose.Types.ObjectId;
  companyId: mongoose.Types.ObjectId;
  expiresAt: Date;
  revokedAt?: Date;
  createdAt: Date;
}

const sessionSchema = new Schema<ISessionDocument>({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date },
}, { timestamps: { createdAt: true, updatedAt: false }, collection: 'sessions' });

sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session = mongoose.model<ISessionDocument>('Session', sessionSchema);

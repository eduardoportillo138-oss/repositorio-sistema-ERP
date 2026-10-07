import mongoose, { Document, Schema } from 'mongoose';

export interface ISaleItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantityMilli: number;
  unitPriceMinor: number;
  discountMinor: number;
  taxRateBps: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}
export interface ISaleDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  customerName: string;
  warehouseId: mongoose.Types.ObjectId;
  warehouseName: string;
  folio: string;
  status: 'draft' | 'confirmed' | 'cancelled';
  items: ISaleItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  confirmedBy?: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const itemSchema = new Schema<ISaleItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantityMilli: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  unitPriceMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  discountMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  taxRateBps: { type: Number, required: true, min: 0, max: 10000,
    validate: Number.isSafeInteger },
  subtotalMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  taxMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  totalMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
}, { _id: false });
const saleSchema = new Schema<ISaleDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
  customerName: { type: String, required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  warehouseName: { type: String, required: true },
  folio: { type: String, required: true },
  status: { type: String, enum: ['draft', 'confirmed', 'cancelled'], default: 'draft' },
  items: { type: [itemSchema], default: [] },
  subtotalMinor: { type: Number, required: true, default: 0 },
  discountMinor: { type: Number, required: true, default: 0 },
  taxMinor: { type: Number, required: true, default: 0 },
  totalMinor: { type: Number, required: true, default: 0 },
  notes: { type: String, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  confirmedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  confirmedAt: Date,
  cancelledAt: Date,
}, { timestamps: true, collection: 'sales' });
saleSchema.index({ companyId: 1, folio: 1 }, { unique: true });
saleSchema.index({ companyId: 1, status: 1, createdAt: -1 });
saleSchema.index({ companyId: 1, customerId: 1, createdAt: -1 });
export const Sale = mongoose.model<ISaleDocument>('Sale', saleSchema);

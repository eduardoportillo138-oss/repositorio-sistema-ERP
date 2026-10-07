import mongoose, { Document, Schema } from 'mongoose';

export interface IPurchaseItem {
  productId: mongoose.Types.ObjectId;
  name: string;
  quantityMilli: number;
  unitCostMinor: number;
  discountMinor: number;
  taxRateBps: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
}
export interface IPurchaseDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  branchId: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  supplierName: string;
  warehouseId: mongoose.Types.ObjectId;
  warehouseName: string;
  folio: string;
  status: 'draft' | 'received' | 'cancelled';
  items: IPurchaseItem[];
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  receivedBy?: mongoose.Types.ObjectId;
  cancelledBy?: mongoose.Types.ObjectId;
  receivedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
const itemSchema = new Schema<IPurchaseItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  quantityMilli: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  unitCostMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  discountMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  taxRateBps: { type: Number, required: true, min: 0, max: 10000,
    validate: Number.isSafeInteger },
  subtotalMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  taxMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  totalMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
}, { _id: false });
const purchaseSchema = new Schema<IPurchaseDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  supplierId: { type: Schema.Types.ObjectId, ref: 'Supplier', required: true },
  supplierName: { type: String, required: true },
  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  warehouseName: { type: String, required: true },
  folio: { type: String, required: true },
  status: { type: String, enum: ['draft', 'received', 'cancelled'], default: 'draft' },
  items: { type: [itemSchema], default: [] },
  subtotalMinor: { type: Number, required: true, default: 0 },
  discountMinor: { type: Number, required: true, default: 0 },
  taxMinor: { type: Number, required: true, default: 0 },
  totalMinor: { type: Number, required: true, default: 0 },
  notes: { type: String, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
  receivedAt: Date,
  cancelledAt: Date,
}, { timestamps: true, collection: 'purchases' });
purchaseSchema.index({ companyId: 1, folio: 1 }, { unique: true });
purchaseSchema.index({ companyId: 1, status: 1, createdAt: -1 });
purchaseSchema.index({ companyId: 1, supplierId: 1, createdAt: -1 });
export const Purchase = mongoose.model<IPurchaseDocument>('Purchase', purchaseSchema);

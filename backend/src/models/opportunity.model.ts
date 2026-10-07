import mongoose, { Document, Schema } from 'mongoose';

export interface IOpportunityDocument extends Document {
  companyId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
  title: string;
  amountMinor: number;
  stage: 'prospecting' | 'proposal' | 'negotiation' | 'won' | 'lost' | 'cancelled';
  expectedCloseDate?: Date;
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IOpportunityDocument>({
  companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
  leadId: { type: Schema.Types.ObjectId, ref: 'Lead' },
  customerId: { type: Schema.Types.ObjectId, ref: 'Customer' },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  amountMinor: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  stage: { type: String,
    enum: ['prospecting', 'proposal', 'negotiation', 'won', 'lost', 'cancelled'],
    default: 'prospecting' },
  expectedCloseDate: Date,
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true, collection: 'opportunities' });
schema.index({ companyId: 1, stage: 1, createdAt: -1 });
schema.index({ companyId: 1, leadId: 1 });
schema.index({ companyId: 1, customerId: 1 });
schema.index({ companyId: 1, assignedTo: 1 });
export const Opportunity = mongoose.model<IOpportunityDocument>('Opportunity', schema);

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ComplaintDocument = Complaint & Document;

@Schema({ timestamps: true })
export class Complaint {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Resident' })
  residentId?: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string; // maintenance, cleaning, security, other

  @Prop({ default: 'open', enum: ['open', 'in_progress', 'resolved', 'closed'] })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedTo?: Types.ObjectId;

  @Prop()
  priority?: string; // low, medium, high, urgent

  @Prop()
  resolution?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop()
  notes?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ComplaintSchema = SchemaFactory.createForClass(Complaint);
// Multi-tenant isolation indexes
ComplaintSchema.index({ tenantId: 1, status: 1 });
ComplaintSchema.index({ tenantId: 1, residentId: 1 });
// Category filtering
ComplaintSchema.index({ tenantId: 1, category: 1 });
ComplaintSchema.index({ tenantId: 1, status: 1, category: 1 });
// Date range queries (for pending > 3 days queries)
ComplaintSchema.index({ tenantId: 1, createdAt: 1 });
ComplaintSchema.index({ tenantId: 1, status: 1, createdAt: 1 });
// Assigned user queries
ComplaintSchema.index({ tenantId: 1, assignedTo: 1 });
ComplaintSchema.index({ tenantId: 1, assignedTo: 1, status: 1 });
// Priority queries
ComplaintSchema.index({ tenantId: 1, priority: 1 });
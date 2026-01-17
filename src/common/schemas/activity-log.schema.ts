import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ActivityLogDocument = ActivityLog & Document;

/**
 * Activity Log Schema
 * User-friendly activity timeline visible to all roles
 * Shows recent events in a readable format
 */
@Schema({ timestamps: true })
export class ActivityLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  eventType: string; // e.g., 'RESIDENT_ADDED', 'BED_ASSIGNED', 'RENT_PAID', 'COMPLAINT_UPDATED'

  @Prop()
  entityType?: string; // e.g., 'Resident', 'Payment', 'Bed', 'Deposit', 'Complaint'

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId; // ID of the affected entity

  @Prop({ required: true })
  message: string; // Human-readable message, e.g., "John Doe was added as a resident"

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  performedBy: Types.ObjectId; // User who performed the action

  @Prop()
  performedByRole?: string; // Role of the user (OWNER, MANAGER, STAFF)

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional context data

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
// Multi-tenant isolation indexes
ActivityLogSchema.index({ tenantId: 1, createdAt: -1 }); // Most recent first (common query)
ActivityLogSchema.index({ tenantId: 1, eventType: 1 });
ActivityLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
// Performed by queries
ActivityLogSchema.index({ tenantId: 1, performedBy: 1, createdAt: -1 });
// Date range queries (for last 30-60 days)
ActivityLogSchema.index({ tenantId: 1, createdAt: 1 });

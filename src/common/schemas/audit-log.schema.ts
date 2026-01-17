import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AuditLogDocument = AuditLog & Document;

/**
 * Audit Log Schema
 * Tracks critical actions for compliance and accountability
 * Read-only, visible only to OWNER role
 */
@Schema({ timestamps: true })
export class AuditLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  action: string; // e.g., 'PAYMENT_MARKED_PAID', 'RENT_AMOUNT_UPDATED', 'DEPOSIT_REFUNDED', 'RESIDENT_VACATED', 'USER_ROLE_CHANGED'

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  performedBy: Types.ObjectId; // User who performed the action

  @Prop()
  entityType?: string; // e.g., 'Resident', 'Payment', 'SecurityDeposit', 'User'

  @Prop({ type: Types.ObjectId })
  entityId?: Types.ObjectId; // ID of the affected entity

  @Prop({ type: Object })
  oldValue?: any; // Previous value (for updates)

  @Prop({ type: Object })
  newValue?: any; // New value (for updates)

  @Prop()
  description?: string; // Human-readable description

  @Prop()
  ipAddress?: string; // IP address of the requester

  @Prop()
  userAgent?: string; // User agent of the requester

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
// Multi-tenant isolation indexes
AuditLogSchema.index({ tenantId: 1, createdAt: -1 }); // Most recent first (common query)
AuditLogSchema.index({ tenantId: 1, action: 1 });
AuditLogSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
// Performed by queries (for user activity tracking)
AuditLogSchema.index({ tenantId: 1, performedBy: 1 });
AuditLogSchema.index({ tenantId: 1, performedBy: 1, createdAt: -1 });
// Date range queries
AuditLogSchema.index({ tenantId: 1, createdAt: 1 }); // Ascending for date range queries
// Entity-based queries
AuditLogSchema.index({ tenantId: 1, entityType: 1, createdAt: -1 });
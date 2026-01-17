import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SavedFilterDocument = SavedFilter & Document;

/**
 * Saved Filter Schema
 * User-specific filter presets for quick access
 * Tenant-scoped and user-specific
 */
@Schema({ timestamps: true })
export class SavedFilter {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId; // User who saved this filter

  @Prop({ required: true })
  name: string; // e.g., "Overdue This Month", "VIP Residents"

  @Prop({ required: true })
  entityType: string; // 'Resident', 'Payment', 'Bed', etc.

  @Prop({ type: Object, required: true })
  filters: Record<string, any>; // Filter criteria as key-value pairs

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SavedFilterSchema = SchemaFactory.createForClass(SavedFilter);
// Multi-tenant isolation indexes
SavedFilterSchema.index({ tenantId: 1, userId: 1 });
SavedFilterSchema.index({ tenantId: 1, userId: 1, entityType: 1 });
// User's saved filters (common query)
SavedFilterSchema.index({ tenantId: 1, userId: 1, isActive: 1 });

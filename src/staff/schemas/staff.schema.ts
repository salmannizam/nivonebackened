import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffDocument = Staff & Document;

@Schema({ timestamps: true })
export class Staff {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop({
    required: true,
    enum: ['WARDEN', 'CLEANER', 'SECURITY', 'OTHER'],
  })
  role: string;

  @Prop()
  shift?: string; // Morning, Evening, Night, etc.

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  address?: string;

  @Prop()
  salary?: number;

  @Prop()
  joiningDate?: Date;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  archived?: boolean; // Soft delete - archived records are hidden by default

  @Prop()
  archivedAt?: Date; // When the record was archived

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const StaffSchema = SchemaFactory.createForClass(Staff);
// Multi-tenant isolation indexes
StaffSchema.index({ tenantId: 1 });
StaffSchema.index({ tenantId: 1, phone: 1 });
// Active staff queries (common dashboard query)
StaffSchema.index({ tenantId: 1, isActive: 1 });
// Role-based queries
StaffSchema.index({ tenantId: 1, role: 1 });
StaffSchema.index({ tenantId: 1, isActive: 1, role: 1 });
// Email queries (if used for login)
StaffSchema.index({ tenantId: 1, email: 1 });
// Archived records (soft delete)
StaffSchema.index({ tenantId: 1, archived: 1 });
StaffSchema.index({ tenantId: 1, archived: 1, isActive: 1 });
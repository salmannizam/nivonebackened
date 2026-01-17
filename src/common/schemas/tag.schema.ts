import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ timestamps: true })
export class Tag {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // Tag name like "VIP", "Late payer", "Staff friend"

  @Prop()
  color?: string; // Hex color code for UI display (e.g., "#3B82F6")

  @Prop()
  category?: string; // Optional category grouping (e.g., "Resident", "Payment", "Room")

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
// Multi-tenant isolation indexes
TagSchema.index({ tenantId: 1, name: 1 }, { unique: true });
TagSchema.index({ tenantId: 1, isActive: 1 });
TagSchema.index({ tenantId: 1, category: 1 });

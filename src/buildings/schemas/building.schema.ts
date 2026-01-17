import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BuildingDocument = Building & Document;

@Schema({ timestamps: true })
export class Building {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  address?: string;

  @Prop()
  description?: string;

  @Prop({ type: Number, default: 1 })
  floors?: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const BuildingSchema = SchemaFactory.createForClass(Building);
// Multi-tenant isolation indexes
BuildingSchema.index({ tenantId: 1 });
// Active buildings queries
BuildingSchema.index({ tenantId: 1, isActive: 1 });
// Name search (if needed)
BuildingSchema.index({ tenantId: 1, name: 1 });
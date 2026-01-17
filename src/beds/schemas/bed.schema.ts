import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BedDocument = Bed & Document;

@Schema({ timestamps: true })
export class Bed {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Room' })
  roomId: Types.ObjectId;

  @Prop({ required: true })
  bedNumber: string; // e.g., "1", "2", "A", "B"

  @Prop({ required: true })
  rent: number; // Monthly rent for this bed

  @Prop({
    default: 'AVAILABLE',
    enum: ['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'],
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const BedSchema = SchemaFactory.createForClass(Bed);
// Multi-tenant isolation indexes
BedSchema.index({ tenantId: 1, roomId: 1 });
BedSchema.index({ tenantId: 1, roomId: 1, bedNumber: 1 }, { unique: true });
// Status filtering (for available beds queries)
BedSchema.index({ tenantId: 1, status: 1 });
BedSchema.index({ tenantId: 1, roomId: 1, status: 1 });
// Rent range queries (less common but useful for filtering)
BedSchema.index({ tenantId: 1, rent: 1 });
// Compound index for available beds in a room
BedSchema.index({ roomId: 1, status: 1 });
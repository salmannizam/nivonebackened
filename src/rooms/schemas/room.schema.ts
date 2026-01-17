import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RoomDocument = Room & Document;

@Schema({ timestamps: true })
export class Room {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Building' })
  buildingId: Types.ObjectId;

  @Prop({ required: true })
  roomNumber: string;

  @Prop()
  floor?: number;

  @Prop({ required: true })
  capacity: number;

  @Prop({ default: 0 })
  occupied: number;

  @Prop()
  roomType?: string; // Single, Double, Triple, etc.

  @Prop({
    description: 'Default rent per bed (template only, not used for billing). Used only when creating new beds.',
  })
  defaultBedRent?: number;

  @Prop({ default: true })
  isAvailable: boolean;

  @Prop()
  amenities?: string[];

  @Prop({ type: [String], default: [] })
  tags?: string[]; // Custom tags like "VIP", "Renovated", "Corner room"

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const RoomSchema = SchemaFactory.createForClass(Room);
// Multi-tenant isolation indexes
RoomSchema.index({ tenantId: 1, buildingId: 1 });
RoomSchema.index({ tenantId: 1, roomNumber: 1 }, { unique: true });
// Availability filtering
RoomSchema.index({ tenantId: 1, isAvailable: 1 });
// Occupancy queries
RoomSchema.index({ tenantId: 1, occupied: 1 });
// Compound index for available rooms in a building
RoomSchema.index({ tenantId: 1, buildingId: 1, isAvailable: 1 });
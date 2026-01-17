import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AssetDocument = Asset & Document;

@Schema({ timestamps: true })
export class Asset {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  name: string; // AC, Geyser, RO, Fan, Light, etc.

  @Prop()
  category?: string; // Electrical, Plumbing, HVAC, etc.

  @Prop({ type: Types.ObjectId, ref: 'Room' })
  roomId?: Types.ObjectId; // Location - which room

  @Prop()
  location?: string; // Common area, Lobby, etc.

  @Prop()
  brand?: string;

  @Prop()
  model?: string;

  @Prop()
  serialNumber?: string;

  @Prop()
  purchaseDate?: Date;

  @Prop()
  warrantyExpiry?: Date;

  @Prop({
    default: 'WORKING',
    enum: ['WORKING', 'REPAIR', 'REPLACED', 'DISPOSED'],
  })
  status: string;

  @Prop()
  lastMaintenanceDate?: Date;

  @Prop()
  nextMaintenanceDate?: Date;

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

export const AssetSchema = SchemaFactory.createForClass(Asset);
// Multi-tenant isolation indexes
AssetSchema.index({ tenantId: 1 });
AssetSchema.index({ tenantId: 1, roomId: 1 });
AssetSchema.index({ tenantId: 1, status: 1 });
// Category filtering
AssetSchema.index({ tenantId: 1, category: 1 });
AssetSchema.index({ tenantId: 1, status: 1, category: 1 });
// Maintenance scheduling queries
AssetSchema.index({ tenantId: 1, nextMaintenanceDate: 1 });
AssetSchema.index({ tenantId: 1, status: 1, nextMaintenanceDate: 1 });
// Location-based queries
AssetSchema.index({ tenantId: 1, roomId: 1, status: 1 });
// Warranty queries
AssetSchema.index({ tenantId: 1, warrantyExpiry: 1 });
// Archived records (soft delete)
AssetSchema.index({ tenantId: 1, archived: 1 });
AssetSchema.index({ tenantId: 1, archived: 1, status: 1 });
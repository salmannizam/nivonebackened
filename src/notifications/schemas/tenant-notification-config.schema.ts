import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationChannel } from '../enums/notification-event.enum';

export type TenantNotificationConfigDocument = TenantNotificationConfig & Document;

/**
 * Super Admin configuration for tenant notifications
 * Controls which channels are allowed for each tenant
 */
@Schema({ timestamps: true })
export class TenantNotificationConfig {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant', unique: true })
  tenantId: Types.ObjectId;

  @Prop({ required: true, default: false })
  emailEnabled: boolean; // Super Admin allows email for this tenant

  @Prop({ required: true, default: false })
  smsEnabled: boolean; // Super Admin allows SMS for this tenant

  @Prop({ type: Number, default: null })
  monthlySmsLimit?: number; // Optional monthly SMS limit (future-ready)

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TenantNotificationConfigSchema = SchemaFactory.createForClass(TenantNotificationConfig);

// Unique index on tenantId
TenantNotificationConfigSchema.index({ tenantId: 1 }, { unique: true });

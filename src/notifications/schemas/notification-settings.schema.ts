import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationEvent, NotificationChannel } from '../enums/notification-event.enum';

export type NotificationSettingsDocument = NotificationSettings & Document;

@Schema({ timestamps: true })
export class NotificationSettings {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.values(NotificationEvent) })
  event: NotificationEvent;

  @Prop({ required: true, type: String, enum: Object.values(NotificationChannel) })
  channel: NotificationChannel;

  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationSettingsSchema = SchemaFactory.createForClass(NotificationSettings);

// Compound index for tenant + event + channel lookup
NotificationSettingsSchema.index({ tenantId: 1, event: 1, channel: 1 }, { unique: true });
// Tenant queries
NotificationSettingsSchema.index({ tenantId: 1, enabled: 1 });
NotificationSettingsSchema.index({ tenantId: 1, event: 1 });

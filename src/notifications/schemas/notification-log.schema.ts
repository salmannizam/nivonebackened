import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { NotificationEvent, NotificationChannel, NotificationStatus } from '../enums/notification-event.enum';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ timestamps: true })
export class NotificationLog {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Resident' })
  residentId?: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.values(NotificationEvent) })
  event: NotificationEvent;

  @Prop({ required: true, type: String, enum: Object.values(NotificationChannel) })
  channel: NotificationChannel;

  @Prop({ required: true, type: String, enum: Object.values(NotificationStatus) })
  status: NotificationStatus;

  @Prop({ type: String })
  recipient?: string; // Email or phone number

  @Prop({ type: Object })
  providerResponse?: Record<string, any>; // Provider-specific response

  @Prop({ type: String })
  errorMessage?: string; // Error message if failed

  @Prop()
  sentAt?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

// Indexes for querying
NotificationLogSchema.index({ tenantId: 1, createdAt: -1 });
NotificationLogSchema.index({ tenantId: 1, event: 1, status: 1 });
NotificationLogSchema.index({ tenantId: 1, channel: 1, status: 1 });
NotificationLogSchema.index({ residentId: 1 });

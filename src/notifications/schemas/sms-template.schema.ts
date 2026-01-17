import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationEvent } from '../enums/notification-event.enum';

export type SmsTemplateDocument = SmsTemplate & Document;

@Schema({ timestamps: true })
export class SmsTemplate {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: String, enum: Object.values(NotificationEvent) })
  event: NotificationEvent;

  @Prop({ required: true })
  message: string; // Template message with {variable} placeholders

  @Prop({ type: [String], default: [] })
  variables: string[]; // List of variable names used in template (e.g., ['name', 'amount'])

  @Prop({ required: true })
  dltTemplateId: string; // DLT registered template ID

  @Prop()
  dltHeaderId?: string; // DLT header ID (optional)

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SmsTemplateSchema = SchemaFactory.createForClass(SmsTemplate);

// Indexes
SmsTemplateSchema.index({ event: 1, isActive: 1 });
SmsTemplateSchema.index({ dltTemplateId: 1 });

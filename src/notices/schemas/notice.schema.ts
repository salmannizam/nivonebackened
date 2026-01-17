import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoticeDocument = Notice & Document;

@Schema({ timestamps: true })
export class Notice {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop()
  category?: string; // general, maintenance, event, important

  @Prop({ default: 'DRAFT', enum: ['DRAFT', 'PUBLISHED', 'EXPIRED', 'INACTIVE', 'ARCHIVED'] })
  status: string;

  @Prop()
  priority?: string; // low, medium, high

  @Prop()
  publishDate?: Date;

  @Prop()
  scheduleStartDate?: Date; // Auto-publish on this date

  @Prop()
  expiryDate?: Date; // Auto-expire on this date

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Resident' }] })
  targetResidents?: Types.ObjectId[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const NoticeSchema = SchemaFactory.createForClass(Notice);
// Multi-tenant isolation indexes
NoticeSchema.index({ tenantId: 1, status: 1 });
NoticeSchema.index({ tenantId: 1, publishDate: 1 });
// Scheduler queries (auto-publish and auto-expire)
NoticeSchema.index({ tenantId: 1, scheduleStartDate: 1, status: 1 });
NoticeSchema.index({ tenantId: 1, expiryDate: 1, status: 1 });
// Category filtering
NoticeSchema.index({ tenantId: 1, category: 1 });
NoticeSchema.index({ tenantId: 1, status: 1, category: 1 });
// Published notices (common query)
NoticeSchema.index({ tenantId: 1, status: 1, publishDate: -1 });
// Target residents queries
NoticeSchema.index({ tenantId: 1, targetResidents: 1 });
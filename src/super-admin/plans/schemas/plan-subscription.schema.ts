import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlanSubscriptionDocument = PlanSubscription & Document;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export enum PaymentStatus {
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  FAILED = 'failed',
}

@Schema({ timestamps: true })
export class PlanSubscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Plan' })
  planId: Types.ObjectId;

  @Prop({ required: true })
  planName: string; // Denormalized for quick access

  @Prop({ required: true })
  planSlug: string; // Denormalized for quick access

  @Prop({ required: true, type: Number })
  price: number; // Price at time of subscription (snapshot)

  @Prop({ required: true, default: SubscriptionStatus.ACTIVE, enum: SubscriptionStatus })
  status: SubscriptionStatus;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date; // For fixed-term subscriptions

  @Prop({ required: true })
  nextBillingDate: Date;

  @Prop({ required: true, default: PaymentStatus.PENDING, enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @Prop()
  lastPaymentDate?: Date;

  @Prop()
  lastPaymentAmount?: number;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSubscriptionSchema = SchemaFactory.createForClass(PlanSubscription);
PlanSubscriptionSchema.index({ tenantId: 1 }, { unique: true }); // One active subscription per tenant
PlanSubscriptionSchema.index({ planId: 1 });
PlanSubscriptionSchema.index({ status: 1 });
PlanSubscriptionSchema.index({ nextBillingDate: 1 });
PlanSubscriptionSchema.index({ paymentStatus: 1 });
PlanSubscriptionSchema.index({ tenantId: 1, status: 1 });

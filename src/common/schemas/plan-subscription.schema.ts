import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { BillingCycle } from './plan.schema';

export type PlanSubscriptionDocument = PlanSubscription & Document;

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  PAID = 'paid',
  DUE = 'due',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  SUSPENDED = 'suspended',
}

@Schema({ timestamps: true })
export class PlanSubscription {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Plan' })
  planId: Types.ObjectId;

  @Prop({ required: true, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.ACTIVE })
  status: SubscriptionStatus;

  @Prop({ required: true })
  startDate: Date;

  @Prop()
  endDate?: Date; // For trial or cancelled subscriptions

  @Prop({ required: true })
  nextBillingDate: Date;

  @Prop({ required: true, type: Number })
  amount: number; // Subscription amount

  @Prop({ required: true, type: String, enum: Object.values(BillingCycle) })
  billingCycle: BillingCycle;

  @Prop({ default: false })
  isPaid: boolean; // Whether current period is paid

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

// Indexes
PlanSubscriptionSchema.index({ tenantId: 1 }, { unique: true }); // One active subscription per tenant
PlanSubscriptionSchema.index({ planId: 1 });
PlanSubscriptionSchema.index({ status: 1 });
PlanSubscriptionSchema.index({ nextBillingDate: 1 }); // For finding due payments
PlanSubscriptionSchema.index({ tenantId: 1, status: 1 });
PlanSubscriptionSchema.index({ nextBillingDate: 1, isPaid: 1 }); // For payment due queries

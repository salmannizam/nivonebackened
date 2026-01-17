import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum BillingCycle {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Number })
  price: number; // Price in smallest currency unit (e.g., paise for INR)

  @Prop({ required: true, enum: BillingCycle, default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ type: Object, default: {} })
  features: {
    onlinePayments?: boolean;
    visitorLogs?: boolean;
    notices?: boolean;
    reports?: boolean;
    maintenance?: boolean;
    analytics?: boolean;
    bedManagement?: boolean;
    staffModule?: boolean;
    gatePass?: boolean;
    assetTracking?: boolean;
    exportData?: boolean;
    moveOutFlow?: boolean;
    auditLogs?: boolean;
    documentStorage?: boolean;
  };

  @Prop({
    type: {
      rooms: { type: Number, default: -1 }, // -1 means unlimited
      residents: { type: Number, default: -1 },
      staff: { type: Number, default: -1 },
    },
    default: {},
  })
  limits: {
    rooms: number;
    residents: number;
    staff: number;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);
PlanSchema.index({ slug: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });

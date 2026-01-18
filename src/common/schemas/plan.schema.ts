import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PlanDocument = Plan & Document;

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Number })
  price: number; // Price in base currency (e.g., INR)

  @Prop({ required: true, enum: Object.values(BillingCycle), default: BillingCycle.MONTHLY })
  billingCycle: BillingCycle;

  @Prop({ type: [String], default: [] })
  features: string[]; // Array of FeatureKey values enabled for this plan

  @Prop({
    type: {
      rooms: { type: Number, default: -1 }, // -1 means unlimited
      residents: { type: Number, default: -1 },
      staff: { type: Number, default: -1 },
      buildings: { type: Number, default: -1 }, // -1 means unlimited
    },
    default: {},
  })
  limits: {
    rooms: number;
    residents: number;
    staff: number;
    buildings?: number;
  };

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDefault: boolean; // Mark this plan as default for new tenant signups

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

// Indexes
PlanSchema.index({ slug: 1 }, { unique: true });
PlanSchema.index({ isActive: 1 });

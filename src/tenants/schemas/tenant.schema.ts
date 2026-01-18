import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

export interface TenantFeatures {
  onlinePayments: boolean;
  visitorLogs: boolean;
  notices: boolean;
  reports: boolean;
  maintenance: boolean;
  analytics: boolean;
  bedManagement: boolean;
  staffModule: boolean;
  gatePass: boolean;
  assetTracking: boolean;
  exportData: boolean;
  moveOutFlow: boolean;
  auditLogs: boolean;
  documentStorage: boolean;
}

export interface TenantLimits {
  rooms: number;
  residents: number;
  staff: number;
  buildings?: number;
}

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ default: 'free' })
  plan: string;

  @Prop({
    type: {
      onlinePayments: { type: Boolean, default: false },
      visitorLogs: { type: Boolean, default: true },
      notices: { type: Boolean, default: true },
      reports: { type: Boolean, default: true },
      maintenance: { type: Boolean, default: true },
      analytics: { type: Boolean, default: false },
      bedManagement: { type: Boolean, default: true },
      staffModule: { type: Boolean, default: true },
      gatePass: { type: Boolean, default: true },
      assetTracking: { type: Boolean, default: true },
      exportData: { type: Boolean, default: true },
    },
    default: {},
  })
  features: TenantFeatures;

  @Prop({
    type: {
      rooms: { type: Number, default: 10 },
      residents: { type: Number, default: 100 },
      staff: { type: Number, default: 5 },
      buildings: { type: Number, default: -1 }, // -1 means unlimited
    },
    default: {},
  })
  limits: TenantLimits;

  @Prop({ default: 'active', enum: ['active', 'suspended', 'inactive'] })
  status: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
// Unique constraints (already enforced by @Prop unique: true, but explicit indexes help)
TenantSchema.index({ slug: 1 }, { unique: true });
TenantSchema.index({ name: 1 }, { unique: true });
// Status filtering (for active tenants in scheduler)
TenantSchema.index({ status: 1 });
// Plan-based queries (for SaaS analytics)
TenantSchema.index({ plan: 1 });
TenantSchema.index({ status: 1, plan: 1 });
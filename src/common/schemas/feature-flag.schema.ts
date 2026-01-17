import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FeatureFlagDocument = FeatureFlag & Document;

// All available features in the system
export enum FeatureKey {
  // Core Features
  BUILDINGS = 'buildings',
  ROOMS = 'rooms',
  BEDS = 'beds',
  RESIDENTS = 'residents',
  
  // Payment Features
  RENT_PAYMENTS = 'rentPayments',
  EXTRA_PAYMENTS = 'extraPayments',
  SECURITY_DEPOSITS = 'securityDeposits',
  ONLINE_PAYMENTS = 'onlinePayments',
  
  // Operations
  COMPLAINTS = 'complaints',
  VISITORS = 'visitors',
  GATE_PASSES = 'gatePasses',
  NOTICES = 'notices',
  
  // Management
  STAFF = 'staff',
  ASSETS = 'assets',
  USER_MANAGEMENT = 'userManagement',
  SETTINGS = 'settings',
  
  // Analytics & Reports
  REPORTS = 'reports',
  INSIGHTS = 'insights',
  EXPORT_DATA = 'exportData',
  
  // Advanced Features
  ACTIVITY_LOG = 'activityLog',
  AUDIT_LOG = 'auditLog',
  SAVED_FILTERS = 'savedFilters',
  CUSTOM_TAGS = 'customTags',
  BULK_ACTIONS = 'bulkActions',
  PRORATION = 'proration',
  PERSONAL_NOTES = 'personalNotes',
  
  // Notifications
  NOTIFICATIONS_EMAIL = 'notifications.email',
  NOTIFICATIONS_SMS = 'notifications.sms',
}

@Schema({ timestamps: true })
export class FeatureFlag {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.values(FeatureKey) })
  featureKey: FeatureKey;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>; // Additional config per feature

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FeatureFlagSchema = SchemaFactory.createForClass(FeatureFlag);

// Compound index for tenant + feature lookup
FeatureFlagSchema.index({ tenantId: 1, featureKey: 1 }, { unique: true });
// Tenant queries
FeatureFlagSchema.index({ tenantId: 1, enabled: 1 });

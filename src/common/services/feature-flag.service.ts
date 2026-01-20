import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlag, FeatureFlagDocument, FeatureKey } from '../schemas/feature-flag.schema';
import { UserFeaturePermission, UserFeaturePermissionDocument } from '../schemas/user-feature-permission.schema';

@Injectable()
export class FeatureFlagService {
  constructor(
    @InjectModel(FeatureFlag.name)
    private featureFlagModel: Model<FeatureFlagDocument>,
    @InjectModel(UserFeaturePermission.name)
    private userPermissionModel: Model<UserFeaturePermissionDocument>,
  ) {}

  /**
   * Check if a feature is enabled for a tenant
   * All feature flags are stored in the database (same for self-hosted and SaaS)
   */
  async isFeatureEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    
    const flag = await this.featureFlagModel.findOne({
      tenantId: tenantObjectId,
      featureKey,
    }).exec();

    // Default to enabled if not found (backward compatibility)
    return flag ? flag.enabled : true;
  }

  /**
   * Check if a feature is enabled for a specific user
   * Checks user-level permissions first, then tenant-level
   */
  async isFeatureEnabledForUser(
    tenantId: string,
    userId: string,
    featureKey: FeatureKey,
  ): Promise<boolean> {
    // First check tenant-level feature flag
    const tenantEnabled = await this.isFeatureEnabled(tenantId, featureKey);
    if (!tenantEnabled) {
      return false;
    }

    // Check user-level permission
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const userObjectId = typeof userId === 'string' 
      ? new Types.ObjectId(userId) 
      : userId;

    const permission = await this.userPermissionModel.findOne({
      tenantId: tenantObjectId,
      userId: userObjectId,
      featureKey,
    }).exec();

    // If no user permission exists, default to enabled (tenant flag controls)
    // If permission exists, use it
    return permission ? permission.enabled : true;
  }

  /**
   * Get all features for a tenant
   * Only returns features that have been assigned (have a feature flag record)
   * All feature flags are stored in the database
   */
  async getTenantFeatures(tenantId: string): Promise<Record<FeatureKey, boolean>> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;

    const flags = await this.featureFlagModel.find({ tenantId: tenantObjectId }).exec();
    const result: Record<string, boolean> = {};

    // Only return features that have been assigned (have a feature flag record)
    flags.forEach((flag) => {
      result[flag.featureKey] = flag.enabled;
    });

    return result as Record<FeatureKey, boolean>;
  }

  /**
   * Get all features for a user
   */
  async getUserFeatures(tenantId: string, userId: string): Promise<Record<FeatureKey, boolean>> {
    const tenantFeatures = await this.getTenantFeatures(tenantId);
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const userObjectId = typeof userId === 'string' 
      ? new Types.ObjectId(userId) 
      : userId;

    const permissions = await this.userPermissionModel.find({
      tenantId: tenantObjectId,
      userId: userObjectId,
    }).exec();

    const result = { ...tenantFeatures };

    // Override with user-specific permissions
    permissions.forEach((perm) => {
      // Only override if tenant feature is enabled
      if (tenantFeatures[perm.featureKey]) {
        result[perm.featureKey] = perm.enabled;
      }
    });

    return result;
  }

  /**
   * Set feature flag for tenant (database only)
   */
  async setTenantFeature(
    tenantId: string,
    featureKey: FeatureKey,
    enabled: boolean,
    metadata?: Record<string, any>,
  ): Promise<FeatureFlagDocument> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;

    return this.featureFlagModel.findOneAndUpdate(
      { tenantId: tenantObjectId, featureKey },
      { enabled, metadata: metadata || {} },
      { upsert: true, new: true },
    ).exec();
  }

  /**
   * Set feature permission for user
   */
  async setUserFeaturePermission(
    tenantId: string,
    userId: string,
    featureKey: FeatureKey,
    enabled: boolean,
    allowedActions?: string[],
  ): Promise<UserFeaturePermissionDocument> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const userObjectId = typeof userId === 'string' 
      ? new Types.ObjectId(userId) 
      : userId;

    return this.userPermissionModel.findOneAndUpdate(
      { tenantId: tenantObjectId, userId: userObjectId, featureKey },
      { enabled, allowedActions: allowedActions || [] },
      { upsert: true, new: true },
    ).exec();
  }

  /**
   * Check if a feature is assigned to a tenant (has a feature flag record)
   */
  async isFeatureAssigned(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    
    const flag = await this.featureFlagModel.findOne({
      tenantId: tenantObjectId,
      featureKey,
    }).exec();
    
    return flag !== null;
  }

  /**
   * Bulk update tenant features
   * Only updates features that are already assigned (prevents creating new feature flags)
   */
  async updateTenantFeatures(
    tenantId: string,
    features: Partial<Record<FeatureKey, boolean>>,
  ): Promise<void> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;

    // Only update features that are already assigned
    const updates = [];
    for (const [key, enabled] of Object.entries(features)) {
      const featureKey = key as FeatureKey;
      const isAssigned = await this.isFeatureAssigned(tenantId, featureKey);
      
      if (isAssigned) {
        updates.push({
          updateOne: {
            filter: { tenantId: tenantObjectId, featureKey },
            update: { $set: { enabled } },
          },
        });
      }
    }

    if (updates.length > 0) {
      await this.featureFlagModel.bulkWrite(updates as any);
    }
  }

  /**
   * Bulk update user feature permissions
   * Validates that tenants can only assign features that are enabled for their tenant
   */
  async updateUserFeaturePermissions(
    tenantId: string,
    userId: string,
    permissions: Partial<Record<FeatureKey, { enabled: boolean; allowedActions?: string[] }>>,
  ): Promise<void> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const userObjectId = typeof userId === 'string' 
      ? new Types.ObjectId(userId) 
      : userId;

    // Get tenant's enabled features
    const tenantFeatures = await this.getTenantFeatures(tenantId);

    // Validate that all features being assigned are enabled for the tenant
    const invalidFeatures: string[] = [];
    Object.keys(permissions).forEach((featureKey) => {
      if (!tenantFeatures[featureKey as FeatureKey]) {
        invalidFeatures.push(featureKey);
      }
    });

    if (invalidFeatures.length > 0) {
      throw new Error(
        `Cannot assign features that are not enabled for your tenant: ${invalidFeatures.join(', ')}`,
      );
    }

    const updates = Object.entries(permissions).map(([key, config]) => ({
      updateOne: {
        filter: { tenantId: tenantObjectId, userId: userObjectId, featureKey: key as FeatureKey },
        update: { 
          $set: { 
            enabled: config.enabled,
            allowedActions: config.allowedActions || [],
          },
        },
        upsert: true,
      },
    }));

    if (updates.length > 0) {
      await this.userPermissionModel.bulkWrite(updates as any);
    }
  }
}

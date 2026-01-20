import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  Query,
  Param,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { TenantId } from '../decorators/tenant.decorator';
import { User } from '../decorators/user.decorator';
import { UserRole } from '../decorators/roles.decorator';
import { FeatureFlagService } from '../services/feature-flag.service';
import { FeatureKey } from '../schemas/feature-flag.schema';

@Controller('feature-flags')
@UseGuards(JwtAuthGuard)
export class FeatureFlagController {
  constructor(
    private readonly featureFlagService: FeatureFlagService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Get all features for current tenant
   */
  @Get('tenant')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getTenantFeatures(@TenantId() tenantId: string): Promise<any> {
    const features = await this.featureFlagService.getTenantFeatures(tenantId);
    return { features };
  }

  /**
   * Get all features for current user
   */
  @Get('user')
  async getUserFeatures(
    @TenantId() tenantId: string,
    @User() user: any,
  ): Promise<any> {
    const features = await this.featureFlagService.getUserFeatures(
      tenantId,
      user._id || user.id,
    );
    return { features };
  }

  /**
   * Update tenant features (OWNER only)
   * NOTE: In SaaS mode, only Super Admin should manage tenant features.
   * Tenants can only assign features to their users, not enable/disable their own features.
   */
  @Patch('tenant')
  @Roles(UserRole.OWNER)
  async updateTenantFeatures(
    @TenantId() tenantId: string,
    @Body() body: { features: Partial<Record<FeatureKey, boolean>> },
  ): Promise<any> {
    const appMode = this.configService.get('APP_MODE', 'SELF_HOSTED');
    
    // In SaaS mode, tenants cannot update their own features - only Super Admin can
    if (appMode === 'SAAS') {
      throw new ForbiddenException(
        'Feature flags can only be updated by Super Admin in SaaS mode. Please contact platform administrator.',
      );
    }
    
    // In self-hosted mode, allow updates but prevent enabling features not already assigned
    // The updateTenantFeatures method will only update features that are already assigned
    await this.featureFlagService.updateTenantFeatures(tenantId, body.features);
    
    return { message: 'Features updated successfully' };
  }

  /**
   * Get user feature permissions (for managing staff)
   * Returns both tenant features (what's available) and user features (what's enabled for user)
   */
  @Get('user/:userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async getUserFeaturePermissions(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
  ): Promise<any> {
    const tenantFeatures = await this.featureFlagService.getTenantFeatures(tenantId);
    const userFeatures = await this.featureFlagService.getUserFeatures(tenantId, userId);
    return { 
      tenantFeatures, // Features enabled for the tenant (what can be assigned)
      userFeatures,  // Features enabled for the user (current permissions)
    };
  }

  /**
   * Update user feature permissions (OWNER/MANAGER only)
   */
  @Patch('user/:userId')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async updateUserFeaturePermissions(
    @TenantId() tenantId: string,
    @Param('userId') userId: string,
    @User() currentUser: any,
    @Body() body: {
      permissions: Partial<Record<FeatureKey, { enabled: boolean; allowedActions?: string[] }>>;
    },
  ): Promise<any> {
    // Prevent users from modifying their own permissions
    const currentUserId = currentUser.userId || currentUser._id || currentUser.id;
    if (currentUserId && currentUserId.toString() === userId.toString()) {
      throw new ForbiddenException(
        'You cannot modify your own permissions. Please ask another administrator to update your permissions.',
      );
    }

    try {
      await this.featureFlagService.updateUserFeaturePermissions(
        tenantId,
        userId,
        body.permissions,
      );
      return { message: 'User feature permissions updated successfully' };
    } catch (error: any) {
      if (error.message && error.message.includes('Cannot assign features')) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }
}

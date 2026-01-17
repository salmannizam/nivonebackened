import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminAuthGuard } from '../../common/guards/super-admin-auth.guard';
import { FeatureFlagService } from '../../common/services/feature-flag.service';
import { FeatureKey } from '../../common/schemas/feature-flag.schema';

@Controller('admin/tenants/:tenantId/features')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTenantFeaturesController {
  constructor(private readonly featureFlagService: FeatureFlagService) {}

  /**
   * Get all features for a specific tenant (Super Admin only)
   */
  @Get()
  async getTenantFeatures(@Param('tenantId') tenantId: string): Promise<any> {
    const features = await this.featureFlagService.getTenantFeatures(tenantId);
    return { features };
  }

  /**
   * Update features for a specific tenant (Super Admin only)
   */
  @Patch()
  async updateTenantFeatures(
    @Param('tenantId') tenantId: string,
    @Body() body: { features: Partial<Record<FeatureKey, boolean>> },
  ): Promise<any> {
    await this.featureFlagService.updateTenantFeatures(tenantId, body.features);
    return { message: 'Tenant features updated successfully' };
  }
}

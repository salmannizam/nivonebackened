import {
  Controller,
  Get,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ResidentAuthGuard } from '../resident-auth/guards/resident-auth.guard';
import { Resident } from '../resident-auth/decorators/resident.decorator';
import { ResidentPortalService } from './resident-portal.service';
import { FeatureFlagService } from '../common/services/feature-flag.service';
import { FeatureKey } from '../common/schemas/feature-flag.schema';

@Controller('resident-portal')
@UseGuards(ResidentAuthGuard)
export class ResidentPortalController {
  constructor(
    private readonly residentPortalService: ResidentPortalService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  private async checkFeatureEnabled(tenantId: string) {
    const isEnabled = await this.featureFlagService.isFeatureEnabled(
      tenantId,
      FeatureKey.RESIDENT_PORTAL,
    );
    if (!isEnabled) {
      throw new ForbiddenException('Resident portal is disabled for this tenant.');
    }
  }

  @Get('dashboard')
  async getDashboard(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getDashboard(resident.userId, resident.tenantId);
  }

  @Get('my-stay')
  async getMyStay(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getMyStay(resident.userId, resident.tenantId);
  }

  @Get('payments')
  async getPayments(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getPayments(resident.userId, resident.tenantId);
  }

  @Get('complaints')
  async getComplaints(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getComplaints(resident.userId, resident.tenantId);
  }

  @Get('notices')
  async getNotices(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getNotices(resident.userId, resident.tenantId);
  }

  @Get('gate-passes')
  async getGatePasses(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getGatePasses(resident.userId, resident.tenantId);
  }

  @Get('visitors')
  async getVisitors(@Resident() resident: any) {
    await this.checkFeatureEnabled(resident.tenantId);
    return await this.residentPortalService.getVisitors(resident.userId, resident.tenantId);
  }
}

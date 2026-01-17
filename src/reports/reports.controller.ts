import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.REPORTS)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Features() // Explicitly override: no features required for dashboard
  async getDashboardStats(@TenantId() tenantId: string) {
    try {
      const stats = await this.reportsService.getDashboardStats(tenantId);
      return stats;
    } catch (error: any) {
      console.error('Error generating dashboard stats:', error.message, error.stack);
      throw error;
    }
  }

  @Get('occupancy')
  getOccupancyReport(@TenantId() tenantId: string) {
    return this.reportsService.getOccupancyReport(tenantId);
  }

  @Get('revenue')
  getRevenueReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @TenantId() tenantId: string,
  ) {
    return this.reportsService.getRevenueReport(
      tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

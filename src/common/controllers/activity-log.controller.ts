import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ActivityLogService } from '../services/activity-log.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FeatureGuard } from '../guards/feature.guard';
import { Features } from '../decorators/feature.decorator';
import { FeatureKey } from '../schemas/feature-flag.schema';
import { TenantId } from '../decorators/tenant.decorator';

@Controller('activity-logs')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.ACTIVITY_LOG)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('eventType') eventType?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('performedBy') performedBy?: string,
    @Query('days') days?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.activityLogService.findAll(tenantId, {
      eventType,
      entityType,
      entityId,
      performedBy,
      days: days ? parseInt(days, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get('recent')
  getRecentActivities(
    @TenantId() tenantId: string,
    @Query('limit') limit?: string,
  ) {
    return this.activityLogService.getRecentActivities(
      tenantId,
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.activityLogService.findOne(id, tenantId);
  }
}

import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { AuditLogService } from '../services/audit-log.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { FeatureGuard } from '../guards/feature.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Features } from '../decorators/feature.decorator';
import { FeatureKey } from '../schemas/feature-flag.schema';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '../decorators/roles.decorator';
import { TenantId } from '../decorators/tenant.decorator';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@Features(FeatureKey.AUDIT_LOG)
@Roles(UserRole.OWNER) // Only OWNER can view audit logs
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('performedBy') performedBy?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    return this.auditLogService.findAll(tenantId, {
      action,
      entityType,
      entityId,
      performedBy,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.auditLogService.findOne(id, tenantId);
  }
}

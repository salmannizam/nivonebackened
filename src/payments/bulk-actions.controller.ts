import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BulkActionsService } from './bulk-actions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('payments/bulk')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@Features(FeatureKey.BULK_ACTIONS)
export class BulkActionsController {
  constructor(private readonly bulkActionsService: BulkActionsService) {}

  @Post('mark-paid')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async bulkMarkPaid(
    @Body() body: { paymentIds: string[]; paymentMode?: string; paidDate?: Date },
    @TenantId() tenantId: string,
  ) {
    return this.bulkActionsService.bulkMarkRentPaid(
      tenantId,
      body.paymentIds,
      body.paymentMode,
      body.paidDate,
    );
  }

  @Post('vacate')
  @Roles(UserRole.OWNER)
  async bulkVacate(
    @Body() body: { residentIds: string[]; moveOutDate: Date; moveOutReason?: string },
    @TenantId() tenantId: string,
  ) {
    return this.bulkActionsService.bulkVacateResidents(
      tenantId,
      body.residentIds,
      body.moveOutDate,
      body.moveOutReason,
    );
  }

  @Post('assign-beds')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async bulkAssignBeds(
    @Body() body: { assignments: Array<{ residentId: string; bedId: string }> },
    @TenantId() tenantId: string,
  ) {
    return this.bulkActionsService.bulkAssignBeds(tenantId, body.assignments);
  }
}

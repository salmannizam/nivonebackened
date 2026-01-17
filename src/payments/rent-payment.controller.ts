import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { RentPaymentService } from './rent-payment.service';
import { UpdateRentPaymentDto } from './dto/update-rent-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('payments/rent')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@Features(FeatureKey.RENT_PAYMENTS)
export class RentPaymentController {
  constructor(private readonly rentPaymentService: RentPaymentService) {}

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findAll(
    @Query('residentId') residentId: string,
    @Query('status') status: string,
    @Query('month') month: string,
    @Query('monthFrom') monthFrom: string,
    @Query('monthTo') monthTo: string,
    @Query('dueDateFrom') dueDateFrom: string,
    @Query('dueDateTo') dueDateTo: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.rentPaymentService.findAll(tenantId, {
      residentId,
      status,
      month,
      monthFrom,
      monthTo,
      dueDateFrom: dueDateFrom ? new Date(dueDateFrom) : undefined,
      dueDateTo: dueDateTo ? new Date(dueDateTo) : undefined,
      search,
    });
  }

  @Get('due-today')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getDueToday(@TenantId() tenantId: string) {
    return this.rentPaymentService.getDueToday(tenantId);
  }

  @Get('due-next-7-days')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getDueInNext7Days(@TenantId() tenantId: string) {
    return this.rentPaymentService.getDueInNext7Days(tenantId);
  }

  @Get('overdue')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getOverdue(@TenantId() tenantId: string) {
    return this.rentPaymentService.getOverdue(tenantId);
  }

  @Get('pending-summary')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  getPendingSummary(@TenantId() tenantId: string) {
    return this.rentPaymentService.getPendingSummary(tenantId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.rentPaymentService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  updatePaymentStatus(
    @Param('id') id: string,
    @Body() updateDto: UpdateRentPaymentDto,
    @TenantId() tenantId: string,
  ) {
    return this.rentPaymentService.updatePaymentStatus(id, tenantId, {
      amountPaid: updateDto.amountPaid ?? 0,
      paidDate: updateDto.paidDate,
      paymentMode: updateDto.paymentMode,
      notes: updateDto.notes,
    });
  }

  // Explicitly forbid POST and DELETE
  @Patch(':id/delete')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  delete() {
    throw new ForbiddenException('Rent payments cannot be deleted');
  }
}

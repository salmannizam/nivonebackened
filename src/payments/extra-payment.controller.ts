import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ExtraPaymentService } from './extra-payment.service';
import { CreateExtraPaymentDto } from './dto/create-extra-payment.dto';
import { UpdateExtraPaymentDto } from './dto/update-extra-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('payments/extra')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@Features(FeatureKey.EXTRA_PAYMENTS)
export class ExtraPaymentController {
  constructor(private readonly extraPaymentService: ExtraPaymentService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@Body() createDto: CreateExtraPaymentDto, @TenantId() tenantId: string): Promise<any> {
    return this.extraPaymentService.create({
      ...createDto,
      tenantId,
    });
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findAll(
    @Query('residentId') residentId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('amountMin') amountMin: string,
    @Query('amountMax') amountMax: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.extraPaymentService.findAll(tenantId, {
      residentId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      search,
    });
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.extraPaymentService.findOne(id, tenantId);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateExtraPaymentDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.extraPaymentService.update(id, tenantId, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.extraPaymentService.remove(id, tenantId);
  }
}

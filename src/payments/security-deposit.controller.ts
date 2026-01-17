import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SecurityDepositService } from './security-deposit.service';
import { CreateSecurityDepositDto } from './dto/create-security-deposit.dto';
import { RefundSecurityDepositDto } from './dto/refund-security-deposit.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('payments/security-deposits')
@UseGuards(JwtAuthGuard, FeatureGuard, RolesGuard)
@Features(FeatureKey.SECURITY_DEPOSITS)
export class SecurityDepositController {
  constructor(private readonly securityDepositService: SecurityDepositService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@Body() createDto: CreateSecurityDepositDto, @TenantId() tenantId: string): Promise<any> {
    return this.securityDepositService.createOrUpdate({
      ...createDto,
      tenantId,
    });
  }

  @Get()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findAll(
    @Query('residentId') residentId: string,
    @Query('received') received: string,
    @Query('refunded') refunded: string,
    @Query('amountMin') amountMin: string,
    @Query('amountMax') amountMax: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.securityDepositService.findAll(tenantId, {
      residentId,
      received: received === 'true' ? true : received === 'false' ? false : undefined,
      refunded: refunded === 'true' ? true : refunded === 'false' ? false : undefined,
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      search,
    });
  }

  @Get('resident/:residentId')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findByResident(
    @Param('residentId') residentId: string,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.securityDepositService.findByResident(tenantId, residentId);
  }

  @Get(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.securityDepositService.findOne(id, tenantId);
  }

  @Patch(':id/mark-received')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  markReceived(
    @Param('id') id: string,
    @Body() data: { receivedDate?: Date; paymentMode?: string },
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.securityDepositService.markReceived(id, tenantId, data);
  }

  @Patch(':id/refund')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  processRefund(
    @Param('id') id: string,
    @Body() refundDto: RefundSecurityDepositDto,
    @TenantId() tenantId: string,
  ) {
    return this.securityDepositService.processRefund(id, tenantId, refundDto);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  update(
    @Param('id') id: string,
    @Body() updateData: {
      amount?: number;
      received?: boolean;
      receivedDate?: Date;
      paymentMode?: string;
      notes?: string;
    },
    @TenantId() tenantId: string,
  ) {
    return this.securityDepositService.update(id, tenantId, updateData);
  }
}

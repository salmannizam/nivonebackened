import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { CheckoutResidentDto } from './dto/checkout-resident.dto';
import { VacateResidentDto } from './dto/vacate-resident.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../common/decorators/roles.decorator';

@Controller('residents')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.RESIDENTS)
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  create(@Body() createResidentDto: CreateResidentDto, @TenantId() tenantId: string): Promise<any> {
    return this.residentsService.create(createResidentDto, tenantId);
  }

  @Get()
  findAll(
    @Query('roomId') roomId: string,
    @Query('bedId') bedId: string,
    @Query('status') status: string,
    @Query('buildingId') buildingId: string,
    @Query('search') search: string,
    @Query('checkInDateFrom') checkInDateFrom: string,
    @Query('checkInDateTo') checkInDateTo: string,
    @TenantId() tenantId: string,
  ) {
    return this.residentsService.findAll(tenantId, {
      roomId,
      bedId,
      status,
      buildingId,
      search,
      checkInDateFrom: checkInDateFrom ? new Date(checkInDateFrom) : undefined,
      checkInDateTo: checkInDateTo ? new Date(checkInDateTo) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.residentsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateResidentDto: UpdateResidentDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.residentsService.update(id, updateResidentDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.residentsService.remove(id, tenantId);
  }

  @Post(':id/checkout')
  checkOut(
    @Param('id') id: string,
    @Body() checkoutDto: CheckoutResidentDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.residentsService.checkOut(id, tenantId, checkoutDto.checkOutDate);
  }

  @Post(':id/vacate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  vacate(
    @Param('id') id: string,
    @Body() vacateDto: VacateResidentDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.residentsService.vacate(id, tenantId, vacateDto);
  }

  @Post(':id/complete-settlement')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  completeSettlement(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.residentsService.completeSettlement(id, tenantId);
  }
}

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
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('visitors')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.VISITORS)
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  create(@Body() createVisitorDto: CreateVisitorDto, @TenantId() tenantId: string): Promise<any> {
    return this.visitorsService.create(createVisitorDto, tenantId);
  }

  @Get()
  findAll(
    @Query('residentId') residentId: string,
    @Query('date') date: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('search') search: string,
    @Query('status') status: string,
    @TenantId() tenantId: string,
  ) {
    return this.visitorsService.findAll(tenantId, {
      residentId,
      date: date ? new Date(date) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      status,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.visitorsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateVisitorDto: UpdateVisitorDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.visitorsService.update(id, updateVisitorDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.visitorsService.remove(id, tenantId);
  }

  @Post(':id/checkout')
  checkOut(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.visitorsService.checkOut(id, tenantId);
  }
}

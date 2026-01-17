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
import { GatePassesService } from './gate-passes.service';
import { CreateGatePassDto } from './dto/create-gate-pass.dto';
import { UpdateGatePassDto } from './dto/update-gate-pass.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('gate-passes')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.GATE_PASSES)
export class GatePassesController {
  constructor(private readonly gatePassesService: GatePassesService) {}

  @Post()
  create(@Body() createGatePassDto: CreateGatePassDto, @TenantId() tenantId: string) {
    return this.gatePassesService.create(createGatePassDto, tenantId);
  }

  @Get()
  findAll(
    @Query('residentId') residentId: string,
    @Query('status') status: string,
    @Query('date') date: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.gatePassesService.findAll(tenantId, {
      residentId,
      status,
      date: date ? new Date(date) : undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
    });
  }

  @Get('active')
  getActivePasses(@TenantId() tenantId: string) {
    return this.gatePassesService.getActivePasses(tenantId);
  }

  @Get('overdue')
  getOverduePasses(@TenantId() tenantId: string) {
    return this.gatePassesService.getOverduePasses(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.gatePassesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateGatePassDto: UpdateGatePassDto,
    @TenantId() tenantId: string,
  ) {
    return this.gatePassesService.update(id, updateGatePassDto, tenantId);
  }

  @Post(':id/return')
  markReturn(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.gatePassesService.markReturn(id, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.gatePassesService.remove(id, tenantId);
  }
}

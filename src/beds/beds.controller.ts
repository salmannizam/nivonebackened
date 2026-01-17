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
import { BedsService } from './beds.service';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('beds')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.BEDS)
export class BedsController {
  constructor(private readonly bedsService: BedsService) {}

  @Post()
  create(@Body() createBedDto: CreateBedDto, @TenantId() tenantId: string) {
    return this.bedsService.create(createBedDto, tenantId);
  }

  @Get()
  findAll(
    @Query('roomId') roomId: string,
    @Query('status') status: string,
    @Query('buildingId') buildingId: string,
    @Query('rentMin') rentMin: string,
    @Query('rentMax') rentMax: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.bedsService.findAll(tenantId, {
      roomId,
      status,
      buildingId,
      rentMin: rentMin ? Number(rentMin) : undefined,
      rentMax: rentMax ? Number(rentMax) : undefined,
      search,
    });
  }

  @Get('available')
  getAvailableBeds(
    @Query('roomId') roomId: string,
    @TenantId() tenantId: string,
  ) {
    return this.bedsService.getAvailableBeds(tenantId, roomId);
  }

  @Get('stats')
  getBedStats(@TenantId() tenantId: string) {
    return this.bedsService.getBedStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.bedsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBedDto: UpdateBedDto,
    @TenantId() tenantId: string,
  ) {
    return this.bedsService.update(id, updateBedDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.bedsService.remove(id, tenantId);
  }
}

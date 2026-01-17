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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('buildings')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.BUILDINGS)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  @Post()
  create(@Body() createBuildingDto: CreateBuildingDto, @TenantId() tenantId: string) {
    return this.buildingsService.create(createBuildingDto, tenantId);
  }

  @Get()
  findAll(
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.buildingsService.findAll(tenantId, { search });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.buildingsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
    @TenantId() tenantId: string,
  ) {
    return this.buildingsService.update(id, updateBuildingDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.buildingsService.remove(id, tenantId);
  }
}

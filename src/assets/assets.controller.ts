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
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('assets')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.ASSETS)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() createAssetDto: CreateAssetDto, @TenantId() tenantId: string) {
    return this.assetsService.create(createAssetDto, tenantId);
  }

  @Get()
  findAll(
    @Query('roomId') roomId: string,
    @Query('status') status: string,
    @Query('category') category: string,
    @Query('location') location: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.assetsService.findAll(tenantId, {
      roomId,
      status,
      category,
      location,
      search,
    });
  }

  @Get('maintenance-due')
  getMaintenanceDue(@TenantId() tenantId: string) {
    return this.assetsService.getMaintenanceDue(tenantId);
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.assetsService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.assetsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @TenantId() tenantId: string,
  ) {
    return this.assetsService.update(id, updateAssetDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.assetsService.remove(id, tenantId);
  }
}

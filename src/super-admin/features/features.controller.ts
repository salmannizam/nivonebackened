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
import { FeaturesService } from './features.service';
import { SuperAdminAuthGuard } from '../../common/guards/super-admin-auth.guard';
import { FeatureKey } from '../../common/schemas/feature-flag.schema';
import { FeatureCategory } from '../../common/schemas/feature.schema';

@Controller('admin/features')
@UseGuards(SuperAdminAuthGuard)
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @Post()
  create(@Body() createDto: {
    name: string;
    key: FeatureKey;
    category: FeatureCategory;
    description: string;
    isActive?: boolean;
  }) {
    return this.featuresService.create(createDto);
  }

  @Get()
  findAll(@Query('activeOnly') activeOnly?: string, @Query('category') category?: string) {
    if (category) {
      return this.featuresService.findByCategory(category as FeatureCategory);
    }
    return this.featuresService.findAll(activeOnly === 'true');
  }

  @Post('seed')
  async seed() {
    await this.featuresService.seedDefaultFeatures();
    return { message: 'Default features seeded successfully' };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.featuresService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: Partial<{
    name: string;
    description: string;
    category: FeatureCategory;
    isActive: boolean;
  }>) {
    return this.featuresService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.featuresService.remove(id);
  }
}

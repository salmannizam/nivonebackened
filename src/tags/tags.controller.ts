import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { UserRole } from '../common/decorators/roles.decorator';

@Controller('tags')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@Features(FeatureKey.CUSTOM_TAGS)
@Roles(UserRole.OWNER, UserRole.MANAGER)
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Post()
  async create(@TenantId() tenantId: string, @Body() createTagDto: CreateTagDto) {
    return this.tagsService.create(tenantId, createTagDto);
  }

  @Get()
  async findAll(@TenantId() tenantId: string) {
    return this.tagsService.findAll(tenantId);
  }

  @Get(':id')
  async findOne(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.tagsService.findOne(tenantId, id);
  }

  @Patch(':id')
  async update(
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateTagDto: UpdateTagDto,
  ) {
    return this.tagsService.update(tenantId, id, updateTagDto);
  }

  @Delete(':id')
  async remove(@TenantId() tenantId: string, @Param('id') id: string) {
    await this.tagsService.remove(tenantId, id);
    return { message: 'Tag deleted successfully' };
  }
}

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
import { NoticesService } from './notices.service';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('notices')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.NOTICES)
export class NoticesController {
  constructor(private readonly noticesService: NoticesService) {}

  @Post()
  create(@Body() createNoticeDto: CreateNoticeDto, @TenantId() tenantId: string): Promise<any> {
    return this.noticesService.create(createNoticeDto, tenantId);
  }

  @Get()
  findAll(
    @Query('status') status: string,
    @Query('category') category: string,
    @Query('priority') priority: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.noticesService.findAll(tenantId, {
      status,
      category,
      priority,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
    });
  }

  @Get('active')
  findActive(@TenantId() tenantId: string) {
    return this.noticesService.findActive(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.noticesService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateNoticeDto: UpdateNoticeDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.noticesService.update(id, updateNoticeDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.noticesService.remove(id, tenantId);
  }
}

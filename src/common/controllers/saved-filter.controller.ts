import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SavedFilterService } from '../services/saved-filter.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { TenantId } from '../decorators/tenant.decorator';

@Controller('saved-filters')
@UseGuards(JwtAuthGuard)
export class SavedFilterController {
  constructor(private readonly savedFilterService: SavedFilterService) {}

  @Post()
  create(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Body() createDto: { name: string; entityType: string; filters: Record<string, any> },
  ) {
    return this.savedFilterService.create(
      tenantId,
      req.user.userId,
      createDto.name,
      createDto.entityType,
      createDto.filters,
    );
  }

  @Get()
  findAll(
    @TenantId() tenantId: string,
    @Request() req: any,
    @Query('entityType') entityType?: string,
  ) {
    return this.savedFilterService.findAll(tenantId, req.user.userId, entityType);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Request() req: any,
  ) {
    return this.savedFilterService.findOne(id, tenantId, req.user.userId);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Request() req: any,
    @Body() updateDto: { name?: string; filters?: Record<string, any> },
  ) {
    return this.savedFilterService.update(id, tenantId, req.user.userId, updateDto);
  }

  @Delete(':id')
  remove(
    @Param('id') id: string,
    @TenantId() tenantId: string,
    @Request() req: any,
  ) {
    return this.savedFilterService.remove(id, tenantId, req.user.userId);
  }
}

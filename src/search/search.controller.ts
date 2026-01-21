import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User } from '../common/decorators/user.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';

@Controller('search')
@UseGuards(JwtAuthGuard, FeatureGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @TenantId() tenantId: string,
    @User() user: any,
  ) {
    const safeQuery = (query || '').trim();
    return this.searchService.search(safeQuery, tenantId, user);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User } from '../common/decorators/user.decorator';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @TenantId() tenantId: string,
    @User() user: any,
  ) {
    const safeQuery = (query || '').trim();
    console.log('[SearchController] Received search request:', { query, safeQuery, tenantId, userId: user?._id || user?.userId });
    return this.searchService.search(safeQuery, tenantId, user);
  }
}

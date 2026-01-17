import { Controller, Get, Query, UseGuards, Inject } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';
import Redis from 'ioredis';

@Controller('insights')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.INSIGHTS)
export class InsightsController {
  constructor(
    private readonly insightsService: InsightsService,
    @Inject('REDIS_CLIENT') private redis: Redis,
  ) {}

  @Get('revenue-trend')
  async getRevenueTrend(
    @TenantId() tenantId: string,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    const cacheKey = `insights:revenue-trend:${tenantId}:${monthsNum}`;

    // Try to get from cache
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Redis error, continue without cache
    }

    const data = await this.insightsService.getRevenueTrend(tenantId, monthsNum);

    // Cache for 15 minutes
    try {
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(data));
    } catch (error) {
      // Redis error, continue without caching
    }

    return data;
  }

  @Get('occupancy-trend')
  async getOccupancyTrend(
    @TenantId() tenantId: string,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    const cacheKey = `insights:occupancy-trend:${tenantId}:${monthsNum}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Continue without cache
    }

    const data = await this.insightsService.getOccupancyTrend(tenantId, monthsNum);

    try {
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(data));
    } catch (error) {
      // Continue without caching
    }

    return data;
  }

  @Get('payment-summary')
  async getPaymentSummary(@TenantId() tenantId: string) {
    const cacheKey = `insights:payment-summary:${tenantId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Continue without cache
    }

    const data = await this.insightsService.getPaymentSummary(tenantId);

    // Cache for 10 minutes (current month data changes more frequently)
    try {
      await this.redis.setex(cacheKey, 10 * 60, JSON.stringify(data));
    } catch (error) {
      // Continue without caching
    }

    return data;
  }

  @Get('complaints-breakdown')
  async getComplaintsBreakdown(@TenantId() tenantId: string) {
    const cacheKey = `insights:complaints-breakdown:${tenantId}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Continue without cache
    }

    const data = await this.insightsService.getComplaintsBreakdown(tenantId);

    try {
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(data));
    } catch (error) {
      // Continue without caching
    }

    return data;
  }

  @Get('vacating-trend')
  async getVacatingTrend(
    @TenantId() tenantId: string,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    const cacheKey = `insights:vacating-trend:${tenantId}:${monthsNum}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Continue without cache
    }

    const data = await this.insightsService.getVacatingTrend(tenantId, monthsNum);

    try {
      await this.redis.setex(cacheKey, 15 * 60, JSON.stringify(data));
    } catch (error) {
      // Continue without caching
    }

    return data;
  }
}

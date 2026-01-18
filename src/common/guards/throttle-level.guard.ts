import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottleLevel } from '../enums/throttle-level.enum';
import { THROTTLE_LEVEL_KEY } from '../decorators/throttle-level.decorator';

@Injectable()
export class ThrottleLevelGuard extends ThrottlerGuard {
  constructor(
    options: any,
    private reflector: Reflector,
  ) {
    super(options);
  }

  protected getTracker(req: Record<string, any>): string {
    // Use IP address as tracker for rate limiting
    return req.ip || req.connection?.remoteAddress || req.headers?.['x-forwarded-for']?.split(',')[0] || 'unknown';
  }

  protected async getLimit(context: ExecutionContext): Promise<number> {
    // Get throttle level from decorator
    const throttleLevel = this.reflector.get<ThrottleLevel>(
      THROTTLE_LEVEL_KEY,
      context.getHandler(),
    ) || ThrottleLevel.MID; // Default to MID

    // Return limit based on level
    return this.getLimitForLevel(throttleLevel);
  }

  protected async getTtl(context: ExecutionContext): Promise<number> {
    // Get throttle level from decorator
    const throttleLevel = this.reflector.get<ThrottleLevel>(
      THROTTLE_LEVEL_KEY,
      context.getHandler(),
    ) || ThrottleLevel.MID; // Default to MID

    // Return TTL (time window in milliseconds) based on level
    return this.getTtlForLevel(throttleLevel);
  }

  private getLimitForLevel(level: ThrottleLevel): number {
    switch (level) {
      case ThrottleLevel.LOW:
        return 100; // 100 requests per minute
      case ThrottleLevel.MID:
        return 60; // 60 requests per minute (default)
      case ThrottleLevel.MODERATE:
        return 45; // 45 requests per minute
      case ThrottleLevel.HIGH:
        return 30; // 30 requests per minute
      default:
        return 60; // Default to MID
    }
  }

  private getTtlForLevel(level: ThrottleLevel): number {
    // All levels use 60 seconds (60000 milliseconds) window
    return 60000;
  }
}

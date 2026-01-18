import { Module } from '@nestjs/common';
import { ThrottlerModule as NestThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { THROTTLER_OPTIONS } from '@nestjs/throttler/dist/throttler.constants';
import { APP_GUARD } from '@nestjs/core';
import { ThrottleLevelGuard } from '../guards/throttle-level.guard';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    NestThrottlerModule.forRoot([
      {
        // Default configuration (MID level) - will be overridden by guard based on decorator
        name: 'default',
        ttl: 60000, // 60 seconds (1 minute)
        limit: 60, // 60 requests per minute (MID default)
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (options: any, storageService: ThrottlerStorage, reflector: Reflector) => {
        return new ThrottleLevelGuard(
          options,
          storageService,
          reflector,
        );
      },
      inject: [THROTTLER_OPTIONS, ThrottlerStorage, Reflector],
    },
  ],
  exports: [NestThrottlerModule],
})
export class ThrottlerModule {}

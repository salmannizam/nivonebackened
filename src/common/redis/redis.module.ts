import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD', '');
        const redisDb = configService.get<number>('REDIS_DB', 0);

        console.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort} (DB: ${redisDb})`);
        return new Redis({
          host: redisHost,
          port: redisPort,
          password: password || undefined,
          db: redisDb,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          enableReadyCheck: true,
          maxRetriesPerRequest: null,
          lazyConnect: true,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

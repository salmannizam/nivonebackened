import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const useSentinel = configService.get<string>('USE_REDIS_SENTINEL', 'false') === 'true';
        const sentinelHostsStr = configService.get<string>('REDIS_SENTINEL_HOSTS', '');
        const password = configService.get<string>('REDIS_PASSWORD', '');
        const redisHost = configService.get<string>('REDIS_HOST', 'localhost');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);

        if (useSentinel && sentinelHostsStr) {
          // Redis Sentinel mode (for production)
          const sentinelHosts = sentinelHostsStr
            .split(',')
            .map((host) => {
              const [hostname, port] = host.trim().split(':');
              return { host: hostname, port: parseInt(port, 10) || 26379 };
            })
            .filter((s) => s.host);

          if (sentinelHosts.length > 0) {
            const sentinelName = configService.get<string>(
              'REDIS_SENTINEL_NAME',
              'mymaster',
            );
            return new Redis({
              sentinels: sentinelHosts,
              name: sentinelName,
              password: password || undefined,
              db: configService.get<number>('REDIS_DB', 0),
              retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
              },
              enableReadyCheck: false,
              maxRetriesPerRequest: null,
            });
          }
        }

        // Direct Redis connection (default for local development)
        console.log(`🔌 Connecting to Redis at ${redisHost}:${redisPort}`);
        return new Redis({
          host: redisHost,
          port: redisPort,
          password: password || undefined,
          db: configService.get<number>('REDIS_DB', 0),
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

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST', '127.0.0.1');
        const redisPort = configService.get<number>('REDIS_PORT', 6379);
        const password = configService.get<string>('REDIS_PASSWORD');
        const redisDb = configService.get<number>('REDIS_DB', 0);

        console.log(
          `🔌 Connecting to Redis at ${redisHost}:${redisPort} (DB: ${redisDb})`,
        );

        return new Redis({
          host: redisHost,
          port: redisPort,
          password: password, // password is REQUIRED in your case
          db: redisDb,
          enableReadyCheck: true,
          maxRetriesPerRequest: null,
          retryStrategy: (times) => Math.min(times * 50, 2000),
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}

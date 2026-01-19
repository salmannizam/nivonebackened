import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ResidentAuthController } from './resident-auth.controller';
import { ResidentAuthService } from './resident-auth.service';
import { OtpService } from './otp.service';
import { Person, PersonSchema } from '../residents/schemas/person.schema';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { Otp, OtpSchema } from './schemas/otp.schema';
import { ResidentJwtStrategy } from './strategies/resident-jwt.strategy';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { TenantsModule } from '../tenants/tenants.module';
import { RedisModule } from '../common/redis/redis.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Person.name, schema: PersonSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '24h'),
        },
      }),
      inject: [ConfigService],
    }),
    FeatureFlagModule,
    TenantsModule,
    RedisModule,
  ],
  controllers: [ResidentAuthController],
  providers: [ResidentAuthService, OtpService, ResidentJwtStrategy],
  exports: [ResidentAuthService, OtpService],
})
export class ResidentAuthModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SuperAdminController } from './super-admin.controller';
import { SuperAdminService } from './super-admin.service';
import { SuperAdmin, SuperAdminSchema } from './schemas/super-admin.schema';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy';
import { SuperAdminAuthController } from './auth/super-admin-auth.controller';
import { SuperAdminAuthService } from './auth/super-admin-auth.service';
import { SuperAdminTenantsController } from './tenants/super-admin-tenants.controller';
import { SuperAdminTenantsService } from './tenants/super-admin-tenants.service';
import { SuperAdminTenantFeaturesController } from './tenants/super-admin-tenants-features.controller';
import { PlansModule } from './plans/plans.module';
import { TenantsModule } from '../tenants/tenants.module';
import { UsersModule } from '../users/users.module';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { FeaturesModule } from './features/features.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SuperAdmin.name, schema: SuperAdminSchema },
    ]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    TenantsModule,
    UsersModule,
    FeatureFlagModule,
    PlansModule,
    FeaturesModule,
  ],
  controllers: [
    SuperAdminController,
    SuperAdminAuthController,
    SuperAdminTenantsController,
    SuperAdminTenantFeaturesController,
  ],
  providers: [
    SuperAdminService,
    SuperAdminAuthService,
    SuperAdminJwtStrategy,
    SuperAdminTenantsService,
  ],
  exports: [SuperAdminService],
})
export class SuperAdminModule {}

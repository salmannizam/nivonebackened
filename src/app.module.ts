import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './common/database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { TenantMiddleware } from './common/middlewares/tenant.middleware';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { Tenant, TenantSchema } from './tenants/schemas/tenant.schema';
import { PlanSubscription, PlanSubscriptionSchema } from './common/schemas/plan-subscription.schema';
import { UsersModule } from './users/users.module';
import { BuildingsModule } from './buildings/buildings.module';
import { RoomsModule } from './rooms/rooms.module';
import { BedsModule } from './beds/beds.module';
import { ResidentsModule } from './residents/residents.module';
import { PaymentsModule } from './payments/payments.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { VisitorsModule } from './visitors/visitors.module';
import { NoticesModule } from './notices/notices.module';
import { ReportsModule } from './reports/reports.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { StaffModule } from './staff/staff.module';
import { AssetsModule } from './assets/assets.module';
import { GatePassesModule } from './gate-passes/gate-passes.module';
import { ExportModule } from './export/export.module';
import { AuditLogModule } from './common/modules/audit-log.module';
import { ActivityLogModule } from './common/modules/activity-log.module';
import { SavedFilterModule } from './common/modules/saved-filter.module';
import { InsightsModule } from './insights/insights.module';
import { FeatureFlagModule } from './common/modules/feature-flag.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TagsModule } from './tags/tags.module';
import { PersonalNotesModule } from './personal-notes/personal-notes.module';
import { ThrottlerModule } from './common/modules/throttler.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get('MONGODB_URI'),
        dbName: configService.get('MONGODB_DB_NAME'),
      }),
      inject: [ConfigService],
    }),
          MongooseModule.forFeature([
            { name: Tenant.name, schema: TenantSchema },
            { name: PlanSubscription.name, schema: PlanSubscriptionSchema },
          ]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    DatabaseModule,
    RedisModule,
    TenantsModule,
    AuthModule,
    UsersModule,
    BuildingsModule,
    RoomsModule,
    BedsModule,
    ResidentsModule,
    PaymentsModule,
    ComplaintsModule,
    VisitorsModule,
    NoticesModule,
    ReportsModule,
    SuperAdminModule,
    StaffModule,
    AssetsModule,
    GatePassesModule,
    ExportModule,
    AuditLogModule,
    ActivityLogModule,
    SavedFilterModule,
    InsightsModule,
    FeatureFlagModule,
    NotificationsModule,
    TagsModule,
    PersonalNotesModule,
    ThrottlerModule,
  ],
  controllers: [AppController],
  providers: [AppService, TenantMiddleware],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'api/health', method: RequestMethod.ALL },
        { path: 'admin/(.*)', method: RequestMethod.ALL },
        { path: 'api/admin/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}

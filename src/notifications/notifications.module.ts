import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController, AdminNotificationsController, AdminSmsTemplatesController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSettings, NotificationSettingsSchema } from './schemas/notification-settings.schema';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { TenantNotificationConfig, TenantNotificationConfigSchema } from './schemas/tenant-notification-config.schema';
import { SmsTemplate, SmsTemplateSchema } from './schemas/sms-template.schema';
import { PlanSubscription, PlanSubscriptionSchema } from '../common/schemas/plan-subscription.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { NotificationsListener } from './notifications.listener';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NotificationSettings.name, schema: NotificationSettingsSchema },
      { name: NotificationLog.name, schema: NotificationLogSchema },
      { name: TenantNotificationConfig.name, schema: TenantNotificationConfigSchema },
      { name: SmsTemplate.name, schema: SmsTemplateSchema },
      { name: PlanSubscription.name, schema: PlanSubscriptionSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [NotificationsController, AdminNotificationsController, AdminSmsTemplatesController],
  providers: [NotificationsService, NotificationsListener],
  exports: [NotificationsService],
})
export class NotificationsModule {}

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { NotificationSettings, NotificationSettingsDocument } from './schemas/notification-settings.schema';
import { NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';
import { TenantNotificationConfig, TenantNotificationConfigDocument } from './schemas/tenant-notification-config.schema';
import { NotificationEvent, NotificationChannel, NotificationStatus } from './enums/notification-event.enum';
import { EmailProvider, SmtpEmailProvider } from './providers/email.provider';
import { SmsProvider, DltSmsProvider } from './providers/sms.provider';
import { FeatureFlagService } from '../common/services/feature-flag.service';
import { SmsTemplate, SmsTemplateDocument } from './schemas/sms-template.schema';
import { ConfigService } from '@nestjs/config';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { PlanSubscription, PlanSubscriptionDocument, SubscriptionStatus } from '../common/schemas/plan-subscription.schema';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private emailProvider: EmailProvider;
  private smsProvider: SmsProvider;

  constructor(
    @InjectModel(NotificationSettings.name)
    private notificationSettingsModel: Model<NotificationSettingsDocument>,
    @InjectModel(NotificationLog.name)
    private notificationLogModel: Model<NotificationLogDocument>,
    @InjectModel(TenantNotificationConfig.name)
    private tenantConfigModel: Model<TenantNotificationConfigDocument>,
    @InjectModel(PlanSubscription.name)
    private subscriptionModel: Model<PlanSubscriptionDocument>,
    @InjectModel(SmsTemplate.name)
    private smsTemplateModel: Model<SmsTemplateDocument>,
    private featureFlagService: FeatureFlagService,
    private configService: ConfigService,
  ) {
    // Initialize real providers
    this.emailProvider = new SmtpEmailProvider(this.configService);
    this.smsProvider = new DltSmsProvider(this.configService);
  }

  /**
   * Main method to send notification
   * Implements the critical decision flow
   */
  async sendNotification(params: {
    tenantId: string;
    event: NotificationEvent;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    message: string;
    html?: string;
    residentId?: string;
  }): Promise<void> {
    const { tenantId, event, channel, recipient, subject, message, html, residentId } = params;

    try {
      // Step 1: Check tenant subscription is active
      const subscription = await this.subscriptionModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      }).exec();

      if (!subscription) {
        await this.logNotification({
          tenantId,
          event,
          channel,
          status: NotificationStatus.SKIPPED,
          recipient,
          residentId,
          errorMessage: 'No active subscription',
        });
        return;
      }

      // Step 2: Check plan includes feature
      const featureKey = channel === NotificationChannel.EMAIL
        ? FeatureKey.NOTIFICATIONS_EMAIL
        : FeatureKey.NOTIFICATIONS_SMS;

      const hasFeature = await this.featureFlagService.isFeatureEnabled(tenantId, featureKey);
      if (!hasFeature) {
        await this.logNotification({
          tenantId,
          event,
          channel,
          status: NotificationStatus.SKIPPED,
          recipient,
          residentId,
          errorMessage: `Feature ${featureKey} not enabled in plan`,
        });
        return;
      }

      // Step 3: Check Super Admin has allowed channel for tenant
      const tenantConfig = await this.tenantConfigModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
      }).exec();

      const channelAllowed = channel === NotificationChannel.EMAIL
        ? tenantConfig?.emailEnabled ?? false
        : tenantConfig?.smsEnabled ?? false;

      if (!channelAllowed) {
        await this.logNotification({
          tenantId,
          event,
          channel,
          status: NotificationStatus.SKIPPED,
          recipient,
          residentId,
          errorMessage: `Channel ${channel} not allowed by admin`,
        });
        return;
      }

      // Step 4: Check tenant has enabled this event
      const settings = await this.notificationSettingsModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        event,
        channel,
      }).exec();

      if (!settings || !settings.enabled) {
        await this.logNotification({
          tenantId,
          event,
          channel,
          status: NotificationStatus.SKIPPED,
          recipient,
          residentId,
          errorMessage: `Event ${event} not enabled for channel ${channel}`,
        });
        return;
      }

      // Step 5: All checks passed - send notification
      let result: { success: boolean; messageId?: string; error?: string };

      if (channel === NotificationChannel.EMAIL) {
        result = await this.emailProvider.sendEmail({
          to: recipient,
          subject: subject || this.getDefaultSubject(event),
          body: message,
          html,
        });
      } else {
        // For SMS, get template if available
        const template = await this.smsTemplateModel.findOne({
          event,
          isActive: true,
        }).exec();

        if (template) {
          // Extract variables from message or use provided variables
          const variables = this.extractVariablesFromMessage(message, template.variables);
          result = await this.smsProvider.sendSms({
            to: recipient,
            message: template.message,
            templateId: template.dltTemplateId,
            variables,
          });
        } else {
          // Fallback to plain message
          result = await this.smsProvider.sendSms({
            to: recipient,
            message,
          });
        }
      }

      // Log result
      await this.logNotification({
        tenantId,
        event,
        channel,
        status: result.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        recipient,
        residentId,
        providerResponse: { messageId: result.messageId },
        errorMessage: result.error,
      });

      if (result.success) {
        this.logger.log(`Notification sent: ${event} via ${channel} to ${recipient}`);
      } else {
        this.logger.warn(`Notification failed: ${event} via ${channel} to ${recipient} - ${result.error}`);
      }
    } catch (error: any) {
      this.logger.error(`Error sending notification: ${error.message}`, error.stack);
      await this.logNotification({
        tenantId,
        event,
        channel,
        status: NotificationStatus.FAILED,
        recipient,
        residentId,
        errorMessage: error.message,
      });
    }
  }

  /**
   * Get default subject for event
   */
  private getDefaultSubject(event: NotificationEvent): string {
    const subjects: Record<NotificationEvent, string> = {
      [NotificationEvent.RESIDENT_CREATED]: 'New Resident Registered',
      [NotificationEvent.RESIDENT_ASSIGNED_ROOM]: 'Resident Room Assignment',
      [NotificationEvent.PAYMENT_DUE]: 'Payment Due Reminder',
      [NotificationEvent.PAYMENT_PAID]: 'Payment Received',
      [NotificationEvent.SECURITY_DEPOSIT_RECEIVED]: 'Security Deposit Received',
      [NotificationEvent.RESIDENT_VACATED]: 'Resident Vacated',
      [NotificationEvent.OTP_SENT]: 'OTP for Resident Portal',
    };
    return subjects[event] || 'Notification';
  }

  /**
   * Log notification attempt
   */
  private async logNotification(params: {
    tenantId: string;
    event: NotificationEvent;
    channel: NotificationChannel;
    status: NotificationStatus;
    recipient?: string;
    residentId?: string;
    providerResponse?: Record<string, any>;
    errorMessage?: string;
  }): Promise<void> {
    try {
      await this.notificationLogModel.create({
        tenantId: new Types.ObjectId(params.tenantId),
        residentId: params.residentId ? new Types.ObjectId(params.residentId) : undefined,
        event: params.event,
        channel: params.channel,
        status: params.status,
        recipient: params.recipient,
        providerResponse: params.providerResponse,
        errorMessage: params.errorMessage,
        sentAt: params.status === NotificationStatus.SENT ? new Date() : undefined,
      });
    } catch (error) {
      this.logger.error(`Failed to log notification: ${error}`);
    }
  }

  /**
   * Get tenant notification settings
   */
  async getTenantSettings(tenantId: string): Promise<NotificationSettingsDocument[]> {
    return this.notificationSettingsModel.find({
      tenantId: new Types.ObjectId(tenantId),
    }).exec();
  }

  /**
   * Update tenant notification settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Array<{ event: NotificationEvent; channel: NotificationChannel; enabled: boolean }>,
  ): Promise<void> {
    for (const setting of settings) {
      await this.notificationSettingsModel.findOneAndUpdate(
        {
          tenantId: new Types.ObjectId(tenantId),
          event: setting.event,
          channel: setting.channel,
        },
        {
          tenantId: new Types.ObjectId(tenantId),
          event: setting.event,
          channel: setting.channel,
          enabled: setting.enabled,
        },
        { upsert: true, new: true },
      ).exec();
    }
  }

  /**
   * Get tenant notification config (admin settings)
   */
  async getTenantConfig(tenantId: string): Promise<TenantNotificationConfigDocument | null> {
    return this.tenantConfigModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
    }).exec();
  }

  /**
   * Update tenant notification config (admin only)
   */
  async updateTenantConfig(
    tenantId: string,
    config: { emailEnabled: boolean; smsEnabled: boolean; monthlySmsLimit?: number },
  ): Promise<TenantNotificationConfigDocument> {
    return this.tenantConfigModel.findOneAndUpdate(
      { tenantId: new Types.ObjectId(tenantId) },
      {
        tenantId: new Types.ObjectId(tenantId),
        emailEnabled: config.emailEnabled,
        smsEnabled: config.smsEnabled,
        monthlySmsLimit: config.monthlySmsLimit,
      },
      { upsert: true, new: true },
    ).exec();
  }

  /**
   * Get notification logs for tenant
   */
  async getNotificationLogs(
    tenantId: string,
    filters?: { event?: NotificationEvent; channel?: NotificationChannel; status?: NotificationStatus },
  ): Promise<NotificationLogDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters?.event) query.event = filters.event;
    if (filters?.channel) query.channel = filters.channel;
    if (filters?.status) query.status = filters.status;

    return this.notificationLogModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .exec();
  }

  /**
   * Extract variables from message for template replacement
   */
  private extractVariablesFromMessage(message: string, templateVariables: string[]): Record<string, string> {
    const variables: Record<string, string> = {};
    
    // Simple extraction - can be enhanced based on message format
    // For now, return empty object and let the template handle it
    return variables;
  }

  /**
   * SMS Template Management
   */
  async createSmsTemplate(data: {
    name: string;
    event: NotificationEvent;
    message: string;
    variables: string[];
    dltTemplateId: string;
    dltHeaderId?: string;
  }): Promise<SmsTemplateDocument> {
    const template = new this.smsTemplateModel(data);
    return template.save();
  }

  async findAllSmsTemplates(event?: NotificationEvent): Promise<SmsTemplateDocument[]> {
    const query: any = {};
    if (event) query.event = event;
    return this.smsTemplateModel.find(query).sort({ event: 1, name: 1 }).exec();
  }

  async findSmsTemplate(id: string): Promise<SmsTemplateDocument> {
    const template = await this.smsTemplateModel.findById(id).exec();
    if (!template) {
      throw new NotFoundException('SMS template not found');
    }
    return template;
  }

  async updateSmsTemplate(id: string, data: Partial<{
    name: string;
    message: string;
    variables: string[];
    dltTemplateId: string;
    dltHeaderId: string;
    isActive: boolean;
  }>): Promise<SmsTemplateDocument> {
    const template = await this.smsTemplateModel.findByIdAndUpdate(id, data, { new: true }).exec();
    if (!template) {
      throw new NotFoundException('SMS template not found');
    }
    return template;
  }

  async deleteSmsTemplate(id: string): Promise<void> {
    const result = await this.smsTemplateModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('SMS template not found');
    }
  }
}

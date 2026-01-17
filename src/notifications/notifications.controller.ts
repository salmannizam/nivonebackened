import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SuperAdminAuthGuard } from '../common/guards/super-admin-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdateTenantNotificationConfigDto } from './dto/update-tenant-notification-config.dto';
import { CreateSmsTemplateDto } from './dto/create-sms-template.dto';
import { UpdateSmsTemplateDto } from './dto/update-sms-template.dto';
import { NotificationEvent, NotificationChannel, NotificationStatus } from './enums/notification-event.enum';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get tenant notification settings (tenant access)
   */
  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings(@TenantId() tenantId: string) {
    return this.notificationsService.getTenantSettings(tenantId);
  }

  /**
   * Update tenant notification settings (tenant access)
   */
  @Patch('settings')
  @UseGuards(JwtAuthGuard)
  async updateSettings(
    @TenantId() tenantId: string,
    @Body() settings: UpdateNotificationSettingsDto[],
  ) {
    await this.notificationsService.updateTenantSettings(tenantId, settings);
    return { message: 'Notification settings updated successfully' };
  }

  /**
   * Get notification logs (tenant access)
   */
  @Get('logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @TenantId() tenantId: string,
    @Query('event') event?: NotificationEvent,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.notificationsService.getNotificationLogs(tenantId, { event, channel, status });
  }

  /**
   * Get allowed channels for current tenant (tenant access)
   */
  @Get('config')
  @UseGuards(JwtAuthGuard)
  async getConfig(@TenantId() tenantId: string) {
    const config = await this.notificationsService.getTenantConfig(tenantId);
    // If no config exists, return null to indicate admin hasn't set restrictions
    // Frontend will treat null as "allowed if plan has feature"
    if (!config) {
      return {
        emailEnabled: null, // null means "not restricted by admin"
        smsEnabled: null,
        monthlySmsLimit: null,
      };
    }
    return {
      emailEnabled: config.emailEnabled,
      smsEnabled: config.smsEnabled,
      monthlySmsLimit: config.monthlySmsLimit,
    };
  }
}

/**
 * Super Admin controller for tenant notification configuration
 */
@Controller('admin/tenants/:tenantId/notifications')
@UseGuards(SuperAdminAuthGuard)
export class AdminNotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Get tenant notification config (admin)
   */
  @Get('config')
  async getConfig(@Param('tenantId') tenantId: string) {
    const config = await this.notificationsService.getTenantConfig(tenantId);
    if (!config) {
      // Return null to indicate admin hasn't set restrictions yet
      return {
        emailEnabled: null,
        smsEnabled: null,
        monthlySmsLimit: null,
      };
    }
    return {
      emailEnabled: config.emailEnabled,
      smsEnabled: config.smsEnabled,
      monthlySmsLimit: config.monthlySmsLimit,
    };
  }

  /**
   * Update tenant notification config (admin)
   */
  @Patch('config')
  async updateConfig(
    @Param('tenantId') tenantId: string,
    @Body() updateDto: UpdateTenantNotificationConfigDto,
  ) {
    return this.notificationsService.updateTenantConfig(tenantId, updateDto);
  }

  /**
   * Get tenant notification settings (admin view)
   */
  @Get('settings')
  async getTenantSettings(@Param('tenantId') tenantId: string) {
    return this.notificationsService.getTenantSettings(tenantId);
  }

  /**
   * Get tenant notification logs (admin view)
   */
  @Get('logs')
  async getTenantLogs(
    @Param('tenantId') tenantId: string,
    @Query('event') event?: NotificationEvent,
    @Query('channel') channel?: NotificationChannel,
    @Query('status') status?: NotificationStatus,
  ) {
    return this.notificationsService.getNotificationLogs(tenantId, { event, channel, status });
  }
}

/**
 * Super Admin controller for SMS template management
 */
@Controller('admin/notifications/sms-templates')
@UseGuards(SuperAdminAuthGuard)
export class AdminSmsTemplatesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Create SMS template
   */
  @Post()
  async create(@Body() createDto: CreateSmsTemplateDto) {
    return this.notificationsService.createSmsTemplate(createDto);
  }

  /**
   * Get all SMS templates
   * Must come before @Get(':id') to avoid route conflicts
   */
  @Get()
  async findAll(@Query('event') event?: NotificationEvent) {
    return this.notificationsService.findAllSmsTemplates(event);
  }

  /**
   * Get SMS template by ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.notificationsService.findSmsTemplate(id);
  }

  /**
   * Update SMS template
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateSmsTemplateDto) {
    return this.notificationsService.updateSmsTemplate(id, updateDto);
  }

  /**
   * Delete SMS template
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.notificationsService.deleteSmsTemplate(id);
    return { message: 'SMS template deleted successfully' };
  }
}

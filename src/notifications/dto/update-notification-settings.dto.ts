import { IsEnum, IsBoolean } from 'class-validator';
import { NotificationEvent, NotificationChannel } from '../enums/notification-event.enum';

export class UpdateNotificationSettingsDto {
  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @IsEnum(NotificationChannel)
  channel: NotificationChannel;

  @IsBoolean()
  enabled: boolean;
}

import { IsString, IsEnum, IsArray, IsOptional, IsBoolean } from 'class-validator';
import { NotificationEvent } from '../enums/notification-event.enum';

export class CreateSmsTemplateDto {
  @IsString()
  name: string;

  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @IsString()
  message: string;

  @IsArray()
  @IsString({ each: true })
  variables: string[];

  @IsString()
  dltTemplateId: string;

  @IsOptional()
  @IsString()
  dltHeaderId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

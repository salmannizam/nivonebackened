import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { NotificationEvent } from '../enums/notification-event.enum';

export class CreateSmsTemplateDto {
  @IsString()
  @IsNotEmpty({ message: 'Template name is required' })
  @MinLength(2, { message: 'Template name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Template name must not exceed 100 characters' })
  @Matches(/^(?!\s*$).+/, { message: 'Template name cannot be empty' })
  name: string;

  @IsEnum(NotificationEvent)
  event: NotificationEvent;

  @IsString()
  @IsNotEmpty({ message: 'Message template is required' })
  @MinLength(10, { message: 'Message template must be at least 10 characters long' })
  @MaxLength(1000, { message: 'Message template must not exceed 1000 characters' })
  @Matches(/^(?!\s*$).+/, { message: 'Message template cannot be empty' })
  message: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(30, { each: true, message: 'Each variable must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    each: true,
    message: 'Variables can only contain letters, numbers, and underscores',
  })
  variables: string[];

  @IsString()
  @IsNotEmpty({ message: 'DLT Template ID is required' })
  @MinLength(5, { message: 'DLT Template ID must be at least 5 digits long' })
  @MaxLength(50, { message: 'DLT Template ID must not exceed 50 digits' })
  @Matches(/^\d+$/, { message: 'DLT Template ID must contain digits only' })
  dltTemplateId: string;

  @IsOptional()
  @IsString()
  @MinLength(5, { message: 'DLT Header ID must be at least 5 digits long' })
  @MaxLength(50, { message: 'DLT Header ID must not exceed 50 digits' })
  @Matches(/^\d+$/, { message: 'DLT Header ID must contain digits only' })
  dltHeaderId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

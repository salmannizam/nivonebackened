import { IsBoolean, IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateTenantNotificationConfigDto {
  @IsBoolean()
  emailEnabled: boolean;

  @IsBoolean()
  smsEnabled: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySmsLimit?: number;
}

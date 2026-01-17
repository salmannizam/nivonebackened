import { IsString, IsArray, IsOptional, IsBoolean } from 'class-validator';

export class UpdateSmsTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  variables?: string[];

  @IsOptional()
  @IsString()
  dltTemplateId?: string;

  @IsOptional()
  @IsString()
  dltHeaderId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

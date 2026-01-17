import { IsString, IsDate, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateNoticeDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  publishDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expiryDate?: Date;

  // Frontend uses startDate/endDate instead of publishDate/expiryDate
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  targetResidents?: string[];
}

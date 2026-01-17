import { IsString, IsOptional, IsDate, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  roomId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  purchaseDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  warrantyExpiry?: Date;

  @IsOptional()
  @IsEnum(['WORKING', 'REPAIR', 'REPLACED', 'DISPOSED'])
  status?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastMaintenanceDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  nextMaintenanceDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

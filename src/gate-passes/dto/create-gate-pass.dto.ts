import { IsString, IsDate, IsOptional, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGatePassDto {
  @IsString()
  residentId: string;

  @IsDate()
  @Type(() => Date)
  exitTime: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expectedReturnTime?: Date;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  destination?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

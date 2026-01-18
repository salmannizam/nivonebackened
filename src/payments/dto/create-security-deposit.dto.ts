import { IsString, IsNumber, IsOptional, IsBoolean, IsDate, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSecurityDepositDto {
  @IsString()
  residentId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsBoolean()
  received?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  receivedDate?: Date;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

import { IsOptional, IsNumber, IsString, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RefundSecurityDepositDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  refundDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  deductionAmount?: number;

  @IsOptional()
  @IsString()
  deductionReason?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

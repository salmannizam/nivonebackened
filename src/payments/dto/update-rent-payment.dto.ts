import { IsNumber, IsOptional, IsString, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateRentPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paidDate?: Date;

  @IsOptional()
  @IsString()
  paymentMode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

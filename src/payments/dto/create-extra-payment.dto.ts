import { IsString, IsNumber, IsDate, IsOptional, IsArray, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateExtraPaymentDto {
  @IsString()
  residentId: string;

  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsString()
  paymentMode: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

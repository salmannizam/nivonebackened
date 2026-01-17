import { IsString, IsNumber, IsOptional, IsDate, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsString()
  residentId: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountDue?: number; // Total amount due for monthly fee

  @IsOptional()
  @IsNumber()
  @Min(0)
  amountPaid?: number; // Amount paid so far

  @IsOptional()
  @IsString()
  month?: string; // Format: "YYYY-MM" for monthly fee tracking

  @IsString()
  paymentType: string;

  @IsString()
  paymentMethod: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  paymentDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // Frontend uses description instead of notes
  @IsOptional()
  @IsString()
  description?: string;

  // Frontend sends status
  @IsOptional()
  @IsEnum(['PAID', 'PARTIAL', 'DUE', 'OVERDUE', 'pending', 'completed', 'failed', 'refunded'])
  status?: string;
}

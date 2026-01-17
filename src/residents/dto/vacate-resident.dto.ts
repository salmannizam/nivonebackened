import { IsDate, IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class VacateResidentDto {
  @IsDate()
  @Type(() => Date)
  moveOutDate: Date;

  @IsOptional()
  @IsString()
  moveOutReason?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  depositDeductionAmount?: number;

  @IsOptional()
  @IsString()
  depositDeductionReason?: string;

  @IsOptional()
  @IsString()
  settlementNotes?: string;
}

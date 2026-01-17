import { IsString, IsOptional, IsDateString } from 'class-validator';

export class AssignPlanDto {
  @IsString()
  planId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string; // If not provided, starts immediately

  @IsOptional()
  @IsDateString()
  trialEndDate?: string; // Optional trial period
}

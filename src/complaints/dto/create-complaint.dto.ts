import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateComplaintDto {
  @IsOptional()
  @IsString()
  residentId?: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsEnum(['open', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

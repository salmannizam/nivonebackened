import { IsString, IsOptional } from 'class-validator';

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
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

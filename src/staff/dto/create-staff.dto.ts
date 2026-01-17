import { IsString, IsEmail, IsOptional, IsNumber, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateStaffDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsEnum(['WARDEN', 'CLEANER', 'SECURITY', 'OTHER'])
  role: string;

  @IsOptional()
  @IsString()
  shift?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  joiningDate?: Date;

  @IsOptional()
  @IsString()
  notes?: string;
}

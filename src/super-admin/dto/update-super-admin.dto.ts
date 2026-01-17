import { PartialType } from '@nestjs/mapped-types';
import { CreateSuperAdminDto } from './create-super-admin.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateSuperAdminDto extends PartialType(CreateSuperAdminDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  isActive?: boolean;
}

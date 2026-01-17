import { PartialType } from '@nestjs/mapped-types';
import { CreateBedDto } from './create-bed.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';

export class UpdateBedDto extends PartialType(CreateBedDto) {
  @IsOptional()
  @IsEnum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE'])
  status?: string;
}

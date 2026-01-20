import { PartialType } from '@nestjs/mapped-types';
import { CreateResidentDto } from './create-resident.dto';
import { IsOptional, IsString, IsDate, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateResidentDto extends PartialType(CreateResidentDto) {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkOutDate?: Date;

  @IsOptional()
  @IsBoolean()
  portalEnabled?: boolean;
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateGatePassDto } from './create-gate-pass.dto';
import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateGatePassDto extends PartialType(CreateGatePassDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  actualReturnTime?: Date;
}

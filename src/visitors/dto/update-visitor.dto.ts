import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitorDto } from './create-visitor.dto';
import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateVisitorDto extends PartialType(CreateVisitorDto) {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkOutTime?: Date;
}

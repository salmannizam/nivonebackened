import { IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CheckoutResidentDto {
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkOutDate?: Date;
}

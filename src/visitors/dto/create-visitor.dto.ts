import { IsString, IsDate, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVisitorDto {
  @IsString()
  residentId: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  idProof?: {
    type: string;
    number: string;
  };

  @IsDate()
  @Type(() => Date)
  visitDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  checkInTime?: Date;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

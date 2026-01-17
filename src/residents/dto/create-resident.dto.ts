import {
  IsString,
  IsEmail,
  IsOptional,
  IsDate,
  IsNumber,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResidentDto {
  @IsString()
  roomId: string;

  @IsString()
  bedId: string; // Required - rent is sourced from bed.rent only

  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  alternatePhone?: string;

  @IsOptional()
  @IsObject()
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth?: Date;

  @IsOptional()
  @IsObject()
  idProof?: {
    type: string;
    number: string;
    documentUrl?: string;
  };

  @IsDate()
  @Type(() => Date)
  checkInDate: Date;

  // Note: monthlyRent removed - rent is sourced from Bed.rent only
  // bedId is now required to ensure rent source is unambiguous

  @IsOptional()
  @IsNumber()
  deposit?: number;

  @IsOptional()
  @IsNumber()
  paymentDueDay?: number; // Day of month when rent is due (1-31)

  @IsOptional()
  depositReceived?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}

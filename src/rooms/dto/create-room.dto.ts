import { IsString, IsNumber, IsOptional, IsArray, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  buildingId: string;

  @IsString()
  roomNumber: string;

  @IsOptional()
  @IsNumber()
  floor?: number;

  @IsNumber()
  @Min(1)
  capacity: number;

  @IsOptional()
  @IsString()
  roomType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultBedRent?: number; // Template only, not used for billing

  @IsOptional()
  @IsArray()
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

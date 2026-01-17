import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateBedDto {
  @IsString()
  roomId: string;

  @IsString()
  bedNumber: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  rent?: number; // Optional - will use room.defaultBedRent if not provided

  @IsOptional()
  @IsString()
  notes?: string;
}

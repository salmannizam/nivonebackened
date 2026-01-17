import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  floors?: number;
}

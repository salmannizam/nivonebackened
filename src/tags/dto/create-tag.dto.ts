import { IsString, IsOptional, IsBoolean, Matches } from 'class-validator';

export class CreateTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid hex color code (e.g., #3B82F6)' })
  color?: string;

  @IsOptional()
  @IsString()
  category?: string;
}

import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class UpdatePersonalNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(10000, { message: 'Note content cannot exceed 10000 characters' })
  content?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

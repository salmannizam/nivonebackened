import { IsString, IsNotEmpty, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreatePersonalNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000, { message: 'Note content cannot exceed 10000 characters' })
  content: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;
}

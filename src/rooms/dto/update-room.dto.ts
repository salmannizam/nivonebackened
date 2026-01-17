import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomDto } from './create-room.dto';
import { IsOptional, IsNumber, Min } from 'class-validator';

export class UpdateRoomDto extends PartialType(CreateRoomDto) {
  @IsOptional()
  @IsNumber()
  @Min(0)
  occupied?: number;

  @IsOptional()
  isAvailable?: boolean;
}

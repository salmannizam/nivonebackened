import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  role?: UserRole;

  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(['en', 'hi'])
  preferredLanguage?: string;
}

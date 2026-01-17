import { IsEmail, IsString, IsOptional, MinLength } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: UserRole;

  tenantId?: string; // Injected from decorator
}

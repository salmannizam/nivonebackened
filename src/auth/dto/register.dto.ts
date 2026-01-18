import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsNotEmpty } from 'class-validator';
import { UserRole } from '../../common/decorators/roles.decorator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsString()
  @IsNotEmpty()
  tenantSlug: string; // Required: tenant slug to create user in

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}

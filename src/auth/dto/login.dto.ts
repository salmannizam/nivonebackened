import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  tenantSlug: string; // Required: tenant slug from subdomain (e.g., tenant-slug.yourdomain.com)
}

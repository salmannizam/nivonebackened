import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,15}$/, {
    message: 'Mobile number must be 10-15 digits',
  })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, {
    message: 'OTP must be 6 digits',
  })
  otp: string;

  @IsOptional()
  @IsString()
  tenantId?: string; // Optional: if provided, login directly to this tenant
}

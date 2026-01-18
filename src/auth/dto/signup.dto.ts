import { IsString, IsEmail, MinLength, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  tenantName: string; // PG/Hostel name

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  ownerName: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  ownerEmail: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;
}

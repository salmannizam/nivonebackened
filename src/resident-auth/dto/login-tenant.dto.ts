import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class LoginTenantDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{10,15}$/, {
    message: 'Mobile number must be 10-15 digits',
  })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

import { 
  IsString, 
  IsOptional, 
  IsObject, 
  IsIn, 
  IsEmail, 
  IsNotEmpty, 
  MinLength, 
  MaxLength, 
  Matches 
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty({ message: 'Tenant name is required' })
  @MinLength(2, { message: 'Tenant name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Tenant name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z0-9\s\-'&.()]+$/, {
    message: 'Tenant name can only contain letters, numbers, spaces, hyphens, apostrophes, ampersands, periods, and parentheses',
  })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  @MinLength(2, { message: 'Slug must be at least 2 characters long' })
  @MaxLength(63, { message: 'Slug must not exceed 63 characters (DNS subdomain limit)' })
  @Matches(/^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only. Must start and end with a letter or number.',
  })
  slug: string;

  @IsOptional()
  @IsString()
  plan?: string;

  @IsOptional()
  @IsString()
  @IsIn(['active', 'suspended', 'inactive'])
  status?: string;

  // Owner user information (required when creating tenant via Super Admin)
  @IsOptional()
  @IsEmail({}, { message: 'Owner email must be a valid email address' })
  @MaxLength(255, { message: 'Owner email must not exceed 255 characters' })
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  ownerPassword?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Owner name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Owner name must not exceed 100 characters' })
  @Matches(/^[a-zA-Z\s\-'.,]+$/, {
    message: 'Owner name can only contain letters, spaces, hyphens, apostrophes, commas, and periods',
  })
  ownerName?: string;

  @IsOptional()
  @IsObject()
  features?: {
    onlinePayments?: boolean;
    visitorLogs?: boolean;
    notices?: boolean;
    reports?: boolean;
    maintenance?: boolean;
    analytics?: boolean;
    bedManagement?: boolean;
    staffModule?: boolean;
    gatePass?: boolean;
    assetTracking?: boolean;
    exportData?: boolean;
    moveOutFlow?: boolean;
    auditLogs?: boolean;
    documentStorage?: boolean;
  };

  @IsOptional()
  @IsObject()
  limits?: {
    rooms?: number;
    residents?: number;
    staff?: number;
    buildings?: number;
  };
}

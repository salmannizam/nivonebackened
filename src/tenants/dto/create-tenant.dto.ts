import { IsString, IsOptional, IsObject, IsIn, IsEmail } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsString()
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
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsString()
  ownerPassword?: string;

  @IsOptional()
  @IsString()
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
  };
}

import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsOptional, IsString, IsIn, IsObject, IsBoolean } from 'class-validator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @IsString()
  @IsIn(['active', 'suspended', 'inactive'])
  status?: string;

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

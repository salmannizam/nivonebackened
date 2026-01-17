import { Request } from 'express';
import { Tenant } from '../../tenants/schemas/tenant.schema';

export interface RequestWithTenant extends Request {
  tenantId?: string;
  tenant?: Tenant;
  user?: {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

export interface RequestWithUser extends RequestWithTenant {
  user: {
    userId: string;
    tenantId: string;
    role: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

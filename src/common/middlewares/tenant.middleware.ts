import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Response, NextFunction } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../../tenants/schemas/tenant.schema';
import { PlanSubscription, PlanSubscriptionDocument, SubscriptionStatus } from '../schemas/plan-subscription.schema';
import { RequestWithTenant } from '../interfaces/request.interface';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(PlanSubscription.name) private subscriptionModel: Model<PlanSubscriptionDocument>,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const path = req.path;
    
    // Skip tenant middleware for health check and admin routes
    // Check both with and without /api prefix since NestJS global prefix handling can vary
    if (
      path === '/api/health' ||
      path === '/health' ||
      path.startsWith('/api/admin') ||
      path.startsWith('/admin') ||
      path.includes('/admin/auth') ||
      path.includes('/admin/tenants')
    ) {
      return next();
    }

    // SaaS mode: detect tenant from subdomain, query parameter, or JWT token
    const host = req.get('host') || '';
    
    // Check if host is an IP address (e.g., 192.168.1.10:3001)
    const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
    
    // Only extract subdomain if it's not an IP address
    let tenantSlug: string | null = null;
    if (!isIPAddress) {
      const subdomain = host.split('.')[0];
      // Only use subdomain if it's a valid tenant slug (not www, api, localhost, or numeric)
      if (subdomain && 
          subdomain !== 'www' && 
          subdomain !== 'api' && 
          subdomain !== 'localhost' && 
          !/^\d+$/.test(subdomain)) { // Don't treat numeric subdomains as tenant slugs
        tenantSlug = subdomain;
      }
    }
    
    // Allow query parameter for localhost/IP testing (e.g., ?tenant=test)
    if (!tenantSlug) {
      tenantSlug = req.query.tenant as string || null;
    }

    // If no tenant slug from URL, try to extract from JWT token (for API calls)
    // Check both cookies (HTTP-only) and Authorization header
    if (!tenantSlug) {
      try {
        // First try to get token from cookie (HTTP-only cookies)
        let token = req.cookies?.accessToken;
        
        // Fallback to Authorization header (for backward compatibility)
        if (!token) {
          const authHeader = req.headers.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
          }
        }
        
        if (token) {
          const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
          if (payload.tenantId) {
            // Set tenantId from token - let JWT guard validate the token first
            // We'll verify tenant exists and is active after token validation
            req.tenantId = payload.tenantId;
            
            // Try to load tenant and subscription for validation
            // But don't throw errors here - let the guard handle token validation first
            try {
              const tenant = await this.tenantModel.findById(new Types.ObjectId(payload.tenantId)).exec();
              if (tenant) {
                req.tenant = tenant;
                
                // Check subscription status
                const subscription = await this.subscriptionModel.findOne({
                  tenantId: tenant._id,
                }).exec();

                if (subscription) {
                  if (subscription.status === SubscriptionStatus.SUSPENDED) {
                    throw new ForbiddenException('Tenant access is suspended. Please contact support.');
                  }
                  if (subscription.status === SubscriptionStatus.EXPIRED) {
                    throw new ForbiddenException('Subscription has expired. Please renew your subscription.');
                  }
                }
              }
            } catch (tenantError: any) {
              // If it's a ForbiddenException, re-throw it (subscription issues)
              if (tenantError instanceof ForbiddenException) {
                throw tenantError;
              }
              // For other errors (tenant not found, etc.), continue
              // The JWT guard will validate the token, and we can check tenant in the guard
            }
            
            return next();
          }
        }
      } catch (e: any) {
        // If it's a ForbiddenException, re-throw it
        if (e instanceof ForbiddenException) {
          throw e;
        }
        // If JWT parsing fails or other errors, continue with normal flow
        // This allows the error to be thrown below if no tenant is found
      }
    }

    if (tenantSlug) {
      const tenant = await this.tenantModel.findOne({
        slug: tenantSlug,
        status: 'active',
      });

      if (!tenant) {
        throw new UnauthorizedException(`Invalid tenant: ${tenantSlug}. Please check the tenant slug.`);
      }

      // Check subscription status
      const subscription = await this.subscriptionModel.findOne({
        tenantId: tenant._id,
      }).exec();

      if (subscription) {
        // Block access if subscription is suspended or expired
        if (subscription.status === SubscriptionStatus.SUSPENDED) {
          throw new ForbiddenException('Tenant access is suspended. Please contact support.');
        }
        if (subscription.status === SubscriptionStatus.EXPIRED) {
          throw new ForbiddenException('Subscription has expired. Please renew your subscription.');
        }
        // Allow trial and active subscriptions
      }

      req.tenantId = tenant._id.toString();
      req.tenant = tenant;
    } else {
      throw new UnauthorizedException('Tenant not found. Please access via subdomain: {tenant-slug}.yourdomain.com or use ?tenant={tenant-slug} for localhost testing');
    }

    next();
  }
}

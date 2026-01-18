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
    
    // Skip tenant middleware for health check, admin routes, public signup, login, and register
    // - Signup: Gets tenantSlug from request body
    // - Register: Gets tenantSlug from request body
    // - Login: Gets tenantSlug from request body and validates it matches user's tenant
    // Check both with and without /api prefix since NestJS global prefix handling can vary
    if (
      path === '/api/health' ||
      path === '/health' ||
      path.startsWith('/api/admin') ||
      path.startsWith('/admin') ||
      path.includes('/admin/auth') ||
      path.includes('/admin/tenants') ||
      path === '/api/auth/signup' ||
      path === '/auth/signup' ||
      path === '/api/auth/login' ||
      path === '/auth/login' ||
      path === '/api/auth/register' ||
      path === '/auth/register'
    ) {
      return next();
    }

    // SaaS mode: prioritize JWT token payload (after login), then subdomain, query parameter, or request body
    // First, try to extract from JWT token (for authenticated API calls after login)
    let tenantSlug: string | null = null;
    let tenantFromToken: TenantDocument | null = null;
    
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
          // Validate tenant exists in database and is active
          const tenant = await this.tenantModel.findById(new Types.ObjectId(payload.tenantId)).exec();
          
          if (!tenant) {
            throw new UnauthorizedException('Tenant not found. Invalid tenant ID in token.');
          }

          if (tenant.status !== 'active') {
            throw new ForbiddenException(`Tenant is ${tenant.status}. Access denied.`);
          }

          // Use tenant slug from token payload if available, otherwise use from database
          tenantSlug = payload.tenantSlug || tenant.slug;
          tenantFromToken = tenant;
          
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
          
          // Set tenantId and tenant from validated database record
          req.tenantId = tenant._id.toString();
          req.tenant = tenant;
          
          return next();
        }
      }
    } catch (e: any) {
      // If it's a ForbiddenException or UnauthorizedException, re-throw it
      if (e instanceof ForbiddenException || e instanceof UnauthorizedException) {
        throw e;
      }
      // If JWT parsing fails or other errors, continue with normal flow
      // This allows fallback to subdomain/query parameter for login
    }

    // If no tenant from token, try subdomain (for initial login or non-authenticated requests)
    if (!tenantSlug) {
      const host = req.get('host') || '';
      
      // Check if host is an IP address (e.g., 192.168.1.10:3001)
      const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?$/.test(host);
      
      // Only extract subdomain if it's not an IP address
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
    }
    
    // Allow query parameter for localhost/IP testing (e.g., ?tenant=test)
    // Note: This is only for non-authenticated requests. After login, tenant comes from JWT token.
    if (!tenantSlug) {
      tenantSlug = req.query.tenant as string || null;
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
      // For authenticated requests, tenant should come from JWT token
      // For non-authenticated requests, provide helpful error message
      throw new UnauthorizedException('Tenant not found. Please access via subdomain: {tenant-slug}.yourdomain.com or use ?tenant={tenant-slug} for localhost testing');
    }

    next();
  }
}

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

    // SaaS mode: Get tenant from JWT token payload (for authenticated requests after login)
    // API domain is same for all tenants, so we don't extract from subdomain
    // Priority: 1) JWT token payload (for authenticated requests), 2) Request body (only for non-authenticated), 3) Query parameter (dev/testing only)
    
    let tenantSlug: string | null = null;
    let tenantFromToken: TenantDocument | null = null;
    let hasValidToken = false;
    
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
          hasValidToken = true;
          
          // Validate tenant exists in database and is active
          const tenant = await this.tenantModel.findById(new Types.ObjectId(payload.tenantId)).exec();
          
          if (!tenant) {
            throw new UnauthorizedException('Tenant not found. Invalid tenant ID in token.');
          }

          if (tenant.status !== 'active') {
            throw new ForbiddenException(`Tenant is ${tenant.status}. Access denied.`);
          }

          // Use tenant slug from token payload (always get from token after login)
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
    }

    // Only try request body if no valid token was found (for non-authenticated requests like login/register)
    // After login, tenant MUST come from JWT token, not from request body
    if (!hasValidToken && !tenantSlug) {
      const body = req.body || {};
      tenantSlug = body.tenantSlug || null;
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
      // For non-authenticated requests, tenant should come from request body (tenantSlug) or query parameter
      throw new UnauthorizedException('Tenant not found. Please provide tenantSlug in request body or use ?tenant={tenant-slug} query parameter');
    }

    next();
  }
}

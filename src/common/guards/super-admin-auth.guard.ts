import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SuperAdminAuthGuard extends AuthGuard('super-admin-jwt') {
  constructor(
    private reflector: Reflector,
    private configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Super Admin is available in both modes, but only via admin routes
    // In self-hosted mode, super admin is hidden from tenant owners
    // In SaaS mode, super admin manages all tenants

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid token');
    }

    // Reject tenant user tokens on admin routes
    if (user.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Super Admin access required. Tenant users cannot access admin routes.');
    }

    // Ensure no tenantId is present (Super Admin doesn't belong to a tenant)
    if (user.tenantId) {
      throw new UnauthorizedException('Invalid token: Super Admin tokens should not have tenantId');
    }

    return user;
  }
}

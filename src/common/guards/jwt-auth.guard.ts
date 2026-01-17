import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestWithTenant } from '../interfaces/request.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
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
    const request = context.switchToHttp().getRequest<RequestWithTenant>();

    if (err || !user) {
      // Log the error for debugging
      if (err) {
        console.error('JWT Auth Guard Error:', err.message || err);
      }
      if (info) {
        console.error('JWT Auth Guard Info:', info.message || info);
      }
      // Check if token exists in cookie
      const tokenInCookie = request.cookies?.accessToken;
      if (!tokenInCookie) {
        throw new UnauthorizedException('No access token found in cookies');
      }
      throw err || new UnauthorizedException(`Invalid token: ${info?.message || 'Token validation failed'}`);
    }

    // Reject Super Admin tokens on tenant routes
    if (user.role === 'SUPER_ADMIN') {
      throw new UnauthorizedException('Super Admin tokens cannot be used on tenant routes. Use /admin/login instead.');
    }

    // Set tenantId from user token if not set by middleware (fallback for API calls)
    if (!request.tenantId && user.tenantId) {
      request.tenantId = user.tenantId;
    }

    // Tenant routes require tenantId
    if (!request.tenantId) {
      throw new UnauthorizedException('Tenant context required. Please access via subdomain or include tenant in query parameter.');
    }

    // Ensure tenantId matches (if both are set)
    if (user.tenantId && request.tenantId && user.tenantId !== request.tenantId) {
      throw new UnauthorizedException('Tenant mismatch: Token tenantId does not match request tenantId');
    }

    return user;
  }
}

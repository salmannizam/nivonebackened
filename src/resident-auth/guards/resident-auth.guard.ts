import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

@Injectable()
export class ResidentAuthGuard extends AuthGuard('resident-jwt') {
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

  handleRequest(err: any, resident: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();

    if (err || !resident) {
      if (err) {
        console.error('Resident Auth Guard Error:', err.message || err);
      }
      if (info) {
        console.error('Resident Auth Guard Info:', info.message || info);
      }
      
      const tokenInCookie = request.cookies?.residentAccessToken;
      if (!tokenInCookie) {
        throw new UnauthorizedException('No access token found. Please login.');
      }
      throw err || new UnauthorizedException(`Invalid token: ${info?.message || 'Token validation failed'}`);
    }

    // Set tenantId on request for middleware compatibility
    request.tenantId = resident.tenantId;
    request.resident = resident;

    return resident;
  }
}

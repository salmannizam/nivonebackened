import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class ResidentJwtStrategy extends PassportStrategy(Strategy, 'resident-jwt') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to get token from cookie
        (request: Request) => {
          const tokenFromCookie = request?.cookies?.residentAccessToken;
          if (tokenFromCookie) {
            return tokenFromCookie;
          }
          
          // Fallback to Authorization header
          const authHeader = request?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
          }
          
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    // Verify this is a resident token
    if (payload.role !== 'RESIDENT') {
      throw new UnauthorizedException('Invalid token type. Resident token required.');
    }

    if (!payload.userId || !payload.tenantId || !payload.personId) {
      throw new UnauthorizedException('Invalid token payload: missing required fields');
    }

    // Return resident object that will be attached to request.resident
    return {
      userId: payload.userId,
      personId: payload.personId,
      tenantId: payload.tenantId,
      tenantSlug: payload.tenantSlug,
      role: payload.role,
      mobile: payload.mobile,
      _id: payload.userId,
      id: payload.userId,
    };
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(
  Strategy,
  'super-admin-jwt',
) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to get token from cookie (HTTP-only)
        (request: Request) => {
          return request?.cookies?.accessToken || null;
        },
        // Fallback to Authorization header (for backward compatibility)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    if (!payload.userId || payload.role !== 'SUPER_ADMIN') {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Super Admin must NOT have tenantId
    if (payload.tenantId) {
      throw new UnauthorizedException('Super Admin token cannot have tenantId');
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: 'SUPER_ADMIN',
    };
  }
}

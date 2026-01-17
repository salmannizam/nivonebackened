import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // First try to get token from cookie (HTTP-only)
        (request: Request) => {
          console.log('=== JWT Strategy - Token Extractor ===');
          console.log('Request cookies:', request?.cookies ? Object.keys(request.cookies) : 'no cookies object');
          const tokenFromCookie = request?.cookies?.accessToken;
          console.log('Token from cookie:', tokenFromCookie ? `${tokenFromCookie.substring(0, 20)}...` : 'not found');
          
          if (tokenFromCookie) {
            console.log('Using token from cookie');
            return tokenFromCookie;
          }
          
          // Check Authorization header as fallback
          const authHeader = request?.headers?.authorization;
          if (authHeader && authHeader.startsWith('Bearer ')) {
            const tokenFromHeader = authHeader.substring(7);
            console.log('Token from Authorization header:', tokenFromHeader ? `${tokenFromHeader.substring(0, 20)}...` : 'not found');
            return tokenFromHeader;
          }
          
          console.log('No token found in cookie or header');
          return null;
        },
        // Fallback to Authorization header (for backward compatibility)
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    console.log('=== JWT Strategy - Validate ===');
    console.log('Token payload:', {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    });
    
    // Reject Super Admin tokens - they must use super-admin-jwt strategy
    if (payload.role === 'SUPER_ADMIN') {
      console.error('Rejecting Super Admin token on tenant route');
      throw new UnauthorizedException('Super Admin tokens cannot be used on tenant routes. Use /admin/auth/login instead.');
    }

    // Tenant user tokens must have tenantId
    if (!payload.userId || !payload.tenantId) {
      console.error('Invalid token payload - missing userId or tenantId:', { userId: payload.userId, tenantId: payload.tenantId });
      throw new UnauthorizedException('Invalid token payload: tenantId required for tenant users');
    }

    // Return user object that will be attached to request.user
    const userObject = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      email: payload.email,
      _id: payload.userId, // Some code might expect _id
      id: payload.userId, // Some code might expect id
    };
    
    console.log('JWT Strategy - Returning user object:', userObject);
    console.log('=== JWT Strategy - Validate Complete ===');
    return userObject;
  }
}

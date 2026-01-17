import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { SuperAdminService } from '../super-admin.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private superAdminService: SuperAdminService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async login(loginDto: SuperAdminLoginDto) {
    const superAdmin = await this.superAdminService.validatePassword(
      loginDto.email,
      loginDto.password,
    );

    if (!superAdmin.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Update last login
    await this.superAdminService.updateLastLogin(superAdmin._id.toString());

    const payload = {
      userId: superAdmin._id.toString(),
      email: superAdmin.email,
      name: superAdmin.name,
      role: 'SUPER_ADMIN',
      // NO tenantId for Super Admin
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in Redis
    await this.redis.set(
      `admin_refresh_token:${superAdmin._id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60, // 7 days
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: superAdmin._id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'SUPER_ADMIN',
      },
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.role !== 'SUPER_ADMIN') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify token exists in Redis
      const storedToken = await this.redis.get(
        `admin_refresh_token:${payload.userId}`,
      );
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        role: 'SUPER_ADMIN',
      };

      const accessToken = this.jwtService.sign(newPayload);

      return {
        accessToken,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string) {
    await this.redis.del(`admin_refresh_token:${userId}`);
    return { message: 'Logged out successfully' };
  }
}

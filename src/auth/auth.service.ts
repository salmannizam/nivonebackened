import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from '../common/decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async validateUser(email: string, password: string, tenantId: string) {
    const user = await this.usersService.findByEmail(email, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto, tenantId: string) {
    // Tenant login - requires tenant context from subdomain
    // This endpoint is ONLY for tenant users (Owner, Manager, Staff)
    // Super Admin must use /admin/auth/login
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required. Please access via your tenant subdomain.');
    }

    const user = await this.validateUser(
      loginDto.email,
      loginDto.password,
      tenantId,
    );

    const payload = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      role: user.role,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in Redis
    await this.redis.set(
      `refresh_token:${user._id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60, // 7 days
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
    };
  }

  async register(registerDto: RegisterDto, tenantId: string) {
    const existingUser = await this.usersService.findByEmail(
      registerDto.email,
      tenantId,
    );
    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
      tenantId,
      role: registerDto.role || UserRole.STAFF,
    });

    return this.login(
      { email: registerDto.email, password: registerDto.password },
      tenantId,
    );
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      // Verify token exists in Redis
      const storedToken = await this.redis.get(`refresh_token:${payload.userId}`);
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        role: payload.role,
        email: payload.email,
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
    await this.redis.del(`refresh_token:${userId}`);
    return { message: 'Logged out successfully' };
  }

  async getUserById(userId: string) {
    // Find user by ID without tenant check (for auth/me endpoint)
    const user = await this.usersService['userModel']
      .findById(userId)
      .select('-password')
      .exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }
}

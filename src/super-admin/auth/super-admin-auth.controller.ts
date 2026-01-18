import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Response,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { Public } from '../../common/decorators/public.decorator';
import { SuperAdminAuthGuard } from '../../common/guards/super-admin-auth.guard';
import { ConfigService } from '@nestjs/config';
import { ThrottleLevel } from '../../common/decorators/throttle-level.decorator';
import { ThrottleLevel as ThrottleLevelEnum } from '../../common/enums/throttle-level.enum';

@Controller('admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @ThrottleLevel(ThrottleLevelEnum.LOW) // Allow more admin login attempts
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: SuperAdminLoginDto,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.superAdminAuthService.login(loginDto);
    
    // Set HTTP-only cookies
    // For cross-origin (different domains), use sameSite: 'none' and secure: true
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Must be true for sameSite: 'none' (cross-origin)
      sameSite: 'none' as const, // Required for cross-origin cookies
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/',
      // Don't set domain - let browser handle cross-origin cookies
    };
    
    res.cookie('accessToken', result.accessToken, cookieOptions);
    res.cookie('refreshToken', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    });
    
    // Return user data without tokens
    return res.json({
      user: result.user,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Request() req: any,
    @Response() res: ExpressResponse,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token required');
    }
    
    const result = await this.superAdminAuthService.refreshToken(refreshToken);
    
    // Set new access token in HTTP-only cookie
    // For cross-origin (different domains), use sameSite: 'none' and secure: true
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: true, // Must be true for sameSite: 'none' (cross-origin)
      sameSite: 'none' as const, // Required for cross-origin cookies
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
      // Don't set domain - let browser handle cross-origin cookies
    });
    
    return res.json({ success: true });
  }

  @UseGuards(SuperAdminAuthGuard)
  @Post('me')
  async getProfile(@Request() req: any) {
    return {
      id: req.user.userId,
      email: req.user.email,
      name: req.user.name,
      role: 'SUPER_ADMIN',
    };
  }

  @UseGuards(SuperAdminAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any, @Response() res: ExpressResponse) {
    await this.superAdminAuthService.logout(req.user.userId);
    
    // Clear HTTP-only cookies (use same settings as when setting cookies)
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
    });
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      path: '/',
    });
    
    return res.json({ message: 'Logged out successfully' });
  }
}

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

@Controller('admin/auth')
export class SuperAdminAuthController {
  constructor(
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: SuperAdminLoginDto,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.superAdminAuthService.login(loginDto);
    
    // Set HTTP-only cookies
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict' as const,
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/',
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
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      path: '/',
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
    
    // Clear HTTP-only cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    return res.json({ message: 'Logged out successfully' });
  }
}

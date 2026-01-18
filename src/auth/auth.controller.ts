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
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @TenantId() tenantId: string,
    @Response() res: ExpressResponse,
  ) {
    // Tenant login requires tenant context from subdomain
    // This endpoint is ONLY for tenant users (Owner, Manager, Staff)
    // Super Admin must use /admin/auth/login
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required. Please access via your tenant subdomain.');
    }
    
    const result = await this.authService.login(loginDto, tenantId);
    
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
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() registerDto: RegisterDto,
    @TenantId() tenantId: string,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.authService.register(registerDto, tenantId);
    
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
    
    const result = await this.authService.refreshToken(refreshToken);
    
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

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req: any, @Response() res: ExpressResponse) {
    await this.authService.logout(req.user.userId);
    
    // Clear HTTP-only cookies
    res.clearCookie('accessToken', { path: '/' });
    res.clearCookie('refreshToken', { path: '/' });
    
    return res.json({ message: 'Logged out successfully' });
  }

  @Public()
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(
    @Body() signupDto: SignupDto,
    @Request() req: any,
  ) {
    const host = req.get('host') || '';
    const result = await this.authService.signup(signupDto, host);
    return result;
  }

  @UseGuards(JwtAuthGuard)
  @Post('me')
  async getProfile(@Request() req: any) {
    console.log('=== /auth/me endpoint called ===');
    console.log('Request cookies:', req.cookies ? Object.keys(req.cookies) : 'no cookies');
    console.log('Request user:', req.user ? { userId: req.user.userId, tenantId: req.user.tenantId, role: req.user.role } : 'no user');
    console.log('Request tenantId:', req.tenantId);
    console.log('Request headers:', req.headers ? { authorization: req.headers.authorization ? 'present' : 'missing', cookie: req.headers.cookie ? 'present' : 'missing' } : 'no headers');
    
    try {
      console.log('Calling getUserById with userId:', req.user.userId);
      const user = await this.authService.getUserById(req.user.userId);
      console.log('User from database:', user ? { id: user._id?.toString(), email: user.email, name: user.name, role: user.role, tenantId: user.tenantId?.toString() } : 'not found');
      
      if (!user) {
        console.error('User not found in database for userId:', req.user.userId);
        throw new UnauthorizedException('User not found');
      }
      
      const response = {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId.toString(),
      };
      
      console.log('Returning response:', response);
      console.log('=== /auth/me endpoint completed successfully ===');
      return response;
    } catch (error: any) {
      console.error('=== /auth/me endpoint ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('=== /auth/me endpoint ERROR END ===');
      throw error;
    }
  }
}

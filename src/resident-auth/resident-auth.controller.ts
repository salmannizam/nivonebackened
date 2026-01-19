import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Response,
  UseGuards,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { ResidentAuthService } from './resident-auth.service';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginTenantDto } from './dto/login-tenant.dto';
import { ResidentAuthGuard } from './guards/resident-auth.guard';
import { Resident } from './decorators/resident.decorator';
import { ThrottleLevel } from '../common/decorators/throttle-level.decorator';
import { ThrottleLevel as ThrottleLevelEnum } from '../common/enums/throttle-level.enum';

@Controller('resident-auth')
export class ResidentAuthController {
  constructor(private readonly residentAuthService: ResidentAuthService) {}

  @Public()
  @ThrottleLevel(ThrottleLevelEnum.LOW) // Rate limit OTP requests
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() requestOtpDto: RequestOtpDto) {
    const result = await this.residentAuthService.requestOtp(requestOtpDto.mobile);
    return { success: result.success, message: result.message || 'OTP sent successfully' };
  }

  @Public()
  @ThrottleLevel(ThrottleLevelEnum.LOW)
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() verifyOtpDto: VerifyOtpDto,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.residentAuthService.verifyOtpAndLogin(
      verifyOtpDto.mobile,
      verifyOtpDto.otp,
      verifyOtpDto.tenantId,
    );

    // If multiple residencies, return list for selection
    if (result.residencies) {
      return res.json({
        multipleResidencies: true,
        residencies: result.residencies,
      });
    }

    // Single residency - set cookies and return
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/',
    };

    res.cookie('residentAccessToken', result.accessToken, cookieOptions);
    res.cookie('residentRefreshToken', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    });

    return res.json({
      resident: result.resident,
    });
  }

  @Public()
  @ThrottleLevel(ThrottleLevelEnum.LOW)
  @Post('login-tenant')
  @HttpCode(HttpStatus.OK)
  async loginWithTenant(
    @Body() loginTenantDto: LoginTenantDto,
    @Response() res: ExpressResponse,
  ) {
    const result = await this.residentAuthService.loginWithTenant(
      loginTenantDto.mobile,
      loginTenantDto.tenantId,
    );

    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: 24 * 60 * 60 * 1000, // 1 day for access token
      path: '/',
    };

    res.cookie('residentAccessToken', result.accessToken, cookieOptions);
    res.cookie('residentRefreshToken', result.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days for refresh token
    });

    return res.json({
      resident: result.resident,
    });
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.residentAuthService.refreshToken(body.refreshToken);
  }

  @UseGuards(ResidentAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Resident() resident: any) {
    return await this.residentAuthService.logout(resident.userId);
  }

  @UseGuards(ResidentAuthGuard)
  @Post('me')
  @HttpCode(HttpStatus.OK)
  async getCurrentResident(@Resident() resident: any) {
    return { resident };
  }
}

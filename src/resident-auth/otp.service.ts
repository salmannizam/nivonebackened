import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { DltSmsProvider } from '../notifications/providers/sms.provider';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
  private readonly OTP_LENGTH = 6;
  private readonly MAX_ATTEMPTS_PER_HOUR = 5; // Rate limiting: max 5 OTP requests per hour per mobile

  constructor(
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @Inject('REDIS_CLIENT') private redis: any,
    private configService: ConfigService,
  ) {}

  /**
   * Generate and send OTP to mobile number
   * Rate-limited to prevent abuse
   */
  async generateAndSendOtp(mobile: string): Promise<{ success: boolean; message?: string }> {
    // Normalize mobile number (remove spaces, +, etc.)
    const normalizedMobile = mobile.replace(/[^0-9]/g, '');

    // Rate limiting check
    const rateLimitKey = `otp_rate_limit:${normalizedMobile}`;
    const attempts = await this.redis.incr(rateLimitKey);
    
    if (attempts === 1) {
      // Set expiry for rate limit key (1 hour)
      await this.redis.expire(rateLimitKey, 3600);
    }

    if (attempts > this.MAX_ATTEMPTS_PER_HOUR) {
      this.logger.warn(`Rate limit exceeded for mobile: ${normalizedMobile}`);
      throw new BadRequestException(
        'Too many OTP requests. Please try again after some time.',
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in database with expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.OTP_EXPIRY_MINUTES);

    await this.otpModel.create({
      mobile: normalizedMobile,
      otp,
      expiresAt,
      verified: false,
    });

    // Send OTP via SMS
    try {
      // Send OTP directly via SMS provider (bypass tenant requirement)
      // Note: This is a system-level OTP, not tied to a specific tenant
      const smsProvider = new DltSmsProvider(this.configService);
      
      const result = await smsProvider.sendSms({
        to: normalizedMobile,
        message: `Your OTP for Resident Portal login is ${otp}. Valid for ${this.OTP_EXPIRY_MINUTES} minutes.`,
      });

      if (!result.success) {
        throw new BadRequestException(`Failed to send OTP: ${result.error || 'Unknown error'}`);
      }

      this.logger.log(`OTP sent to mobile: ${normalizedMobile}`);
      return {
        success: true,
        message: 'OTP sent successfully',
      };
    } catch (error: any) {
      this.logger.error(`Failed to send OTP: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to send OTP. Please try again.');
    }
  }

  /**
   * Verify OTP
   * Returns true if OTP is valid and not expired
   */
  async verifyOtp(mobile: string, otp: string): Promise<boolean> {
    const normalizedMobile = mobile.replace(/[^0-9]/g, '');

    // Find the most recent unverified OTP for this mobile
    const otpRecord = await this.otpModel
      .findOne({
        mobile: normalizedMobile,
        otp,
        verified: false,
        expiresAt: { $gt: new Date() }, // Not expired
      })
      .sort({ createdAt: -1 })
      .exec();

    if (!otpRecord) {
      return false;
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    return true;
  }

  /**
   * Clean up expired OTPs (can be called by a scheduled job)
   */
  async cleanupExpiredOtps(): Promise<void> {
    const result = await this.otpModel.deleteMany({
      expiresAt: { $lt: new Date() },
    }).exec();
    
    this.logger.log(`Cleaned up ${result.deletedCount} expired OTPs`);
  }
}

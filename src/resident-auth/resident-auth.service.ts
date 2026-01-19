import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import { Person, PersonDocument } from '../residents/schemas/person.schema';
import { Resident, ResidentDocument } from '../residents/schemas/resident.schema';
import { OtpService } from './otp.service';
import { FeatureFlagService } from '../common/services/feature-flag.service';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class ResidentAuthService {
  private readonly logger = new Logger(ResidentAuthService.name);

  constructor(
    @InjectModel(Person.name) private personModel: Model<PersonDocument>,
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    private otpService: OtpService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: any,
    private featureFlagService: FeatureFlagService,
    private tenantsService: TenantsService,
  ) {}

  /**
   * Request OTP for resident login
   * Checks if feature is enabled and if resident exists
   */
  async requestOtp(mobile: string): Promise<{ success: boolean; message: string }> {
    const normalizedMobile = mobile.replace(/[^0-9]/g, '');

    // Find or create Person by mobile
    let person = await this.personModel.findOne({ mobile: normalizedMobile }).exec();
    
    if (!person) {
      // Person doesn't exist - create one (name will be updated when resident is created)
      person = await this.personModel.create({
        mobile: normalizedMobile,
        name: 'Resident', // Placeholder, will be updated from resident record
      });
    }

    // Check if person has any active residents with portal enabled
    const activeResidents = await this.residentModel
      .find({
        personId: person._id,
        status: 'ACTIVE',
        portalEnabled: true,
        archived: { $ne: true },
      })
      .populate('tenantId')
      .exec();

    if (activeResidents.length === 0) {
      throw new ForbiddenException(
        'No active residency found with portal access enabled. Please contact your PG administrator.',
      );
    }

    // Check if feature is enabled for at least one tenant
    let featureEnabled = false;
    for (const resident of activeResidents) {
      const tenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
      if (tenantId) {
        const isEnabled = await this.featureFlagService.isFeatureEnabled(
          tenantId,
          FeatureKey.RESIDENT_PORTAL,
        );
        if (isEnabled) {
          featureEnabled = true;
          break;
        }
      }
    }

    if (!featureEnabled) {
      throw new ForbiddenException(
        'Resident portal is not enabled for your PG. Please contact your administrator.',
      );
    }

    // Generate and send OTP
    const result = await this.otpService.generateAndSendOtp(normalizedMobile);
    return {
      success: result.success,
      message: result.message || 'OTP sent successfully',
    };
  }

  /**
   * Verify OTP and login
   * Returns active residencies if multiple, or auto-login if single
   */
  async verifyOtpAndLogin(
    mobile: string,
    otp: string,
    tenantId?: string,
  ): Promise<{
    accessToken?: string;
    refreshToken?: string;
    resident?: any;
    residencies?: Array<{ tenantId: string; tenantName: string; tenantSlug: string }>;
  }> {
    const normalizedMobile = mobile.replace(/[^0-9]/g, '');

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(normalizedMobile, otp);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Find Person by mobile
    const person = await this.personModel.findOne({ mobile: normalizedMobile }).exec();
    if (!person) {
      throw new UnauthorizedException('Person not found');
    }

    // Find active residents with portal enabled
    const query: any = {
      personId: person._id,
      status: 'ACTIVE',
      portalEnabled: true,
      archived: { $ne: true },
    };

    // If tenantId is provided, filter by it
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    const activeResidents = await this.residentModel
      .find(query)
      .populate('tenantId')
      .populate('roomId')
      .populate('bedId')
      .exec();

    if (activeResidents.length === 0) {
      throw new ForbiddenException(
        'No active residency found with portal access enabled.',
      );
    }

    // Check feature flag for each tenant and filter
    const validResidents = [];
    for (const resident of activeResidents) {
      const residentTenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
      if (residentTenantId) {
        const isEnabled = await this.featureFlagService.isFeatureEnabled(
          residentTenantId,
          FeatureKey.RESIDENT_PORTAL,
        );
        if (isEnabled) {
          validResidents.push(resident);
        }
      }
    }

    if (validResidents.length === 0) {
      throw new ForbiddenException(
        'Resident portal is not enabled for your PG. Please contact your administrator.',
      );
    }

    // Case 1: Single active residency - auto login
    if (validResidents.length === 1) {
      const resident = validResidents[0];
      const tenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
      const tenant = await this.tenantsService.findOne(tenantId);
      
      return await this.generateTokens(resident, person, tenant);
    }

    // Case 2: Multiple active residencies - return list for selection
    const residencies = await Promise.all(
      validResidents.map(async (resident) => {
        const residentTenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
        const tenant = await this.tenantsService.findOne(residentTenantId);
        return {
          tenantId: residentTenantId,
          tenantName: tenant.name,
          tenantSlug: tenant.slug,
        };
      }),
    );

    return { residencies };
  }

  /**
   * Login with selected tenant (after multi-PG selection)
   */
  async loginWithTenant(
    mobile: string,
    tenantId: string,
  ): Promise<{ accessToken: string; refreshToken: string; resident: any }> {
    const normalizedMobile = mobile.replace(/[^0-9]/g, '');

    // Find Person by mobile
    const person = await this.personModel.findOne({ mobile: normalizedMobile }).exec();
    if (!person) {
      throw new UnauthorizedException('Person not found');
    }

    // Find active resident for this tenant
    const resident = await this.residentModel
      .findOne({
        personId: person._id,
        tenantId: new Types.ObjectId(tenantId),
        status: 'ACTIVE',
        portalEnabled: true,
        archived: { $ne: true },
      })
      .populate('tenantId')
      .populate('roomId')
      .populate('bedId')
      .exec();

    if (!resident) {
      throw new ForbiddenException(
        'No active residency found with portal access enabled for this PG.',
      );
    }

    // Check feature flag
    const isEnabled = await this.featureFlagService.isFeatureEnabled(
      tenantId,
      FeatureKey.RESIDENT_PORTAL,
    );
    if (!isEnabled) {
      throw new ForbiddenException(
        'Resident portal is not enabled for this PG.',
      );
    }

    const tenant = await this.tenantsService.findOne(tenantId);
    return await this.generateTokens(resident, person, tenant);
  }

  /**
   * Generate JWT tokens for resident
   */
  private async generateTokens(
    resident: ResidentDocument,
    person: PersonDocument,
    tenant: any,
  ): Promise<{ accessToken: string; refreshToken: string; resident: any }> {
    const tenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
    
    const payload = {
      userId: resident._id.toString(),
      personId: person._id.toString(),
      tenantId,
      tenantSlug: tenant.slug,
      role: 'RESIDENT',
      mobile: person.mobile,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '24h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    // Store refresh token in Redis
    await this.redis.set(
      `resident_refresh_token:${resident._id}`,
      refreshToken,
      'EX',
      7 * 24 * 60 * 60, // 7 days
    );

    // Transform resident data
    const residentObj = resident.toObject ? resident.toObject() : resident;
    const room = (residentObj.roomId as any) || {};
    const bed = (residentObj.bedId as any) || {};

    return {
      accessToken,
      refreshToken,
      resident: {
        id: resident._id,
        name: resident.name,
        phone: resident.phone,
        email: resident.email,
        roomNumber: room.roomNumber || null,
        bedNumber: bed.bedNumber || null,
        tenantId,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
      },
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      if (payload.role !== 'RESIDENT') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify token exists in Redis
      const storedToken = await this.redis.get(
        `resident_refresh_token:${payload.userId}`,
      );
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Verify resident is still active and portal is enabled
      const resident = await this.residentModel
        .findById(payload.userId)
        .exec();

      if (!resident || resident.status !== 'ACTIVE' || !resident.portalEnabled || resident.archived) {
        throw new UnauthorizedException('Resident access revoked');
      }

      // Check feature flag
      const isEnabled = await this.featureFlagService.isFeatureEnabled(
        payload.tenantId,
        FeatureKey.RESIDENT_PORTAL,
      );
      if (!isEnabled) {
        throw new UnauthorizedException('Resident portal is disabled');
      }

      const newPayload = {
        userId: payload.userId,
        personId: payload.personId,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug,
        role: 'RESIDENT',
        mobile: payload.mobile,
      };

      const accessToken = this.jwtService.sign(newPayload);

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout - invalidate refresh token
   */
  async logout(residentId: string) {
    await this.redis.del(`resident_refresh_token:${residentId}`);
    return { message: 'Logged out successfully' };
  }
}

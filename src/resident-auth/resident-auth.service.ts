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
      // Person doesn't exist - create one (name will be updated from resident record)
      person = await this.personModel.create({
        mobile: normalizedMobile,
        name: 'Resident', // Placeholder, will be updated from resident record
      });
    }

    // Check if person has any active residents (by personId)
    let activeResidents = await this.residentModel
      .find({
        personId: person._id,
        status: 'ACTIVE',
        archived: { $ne: true },
      })
      .populate('tenantId')
      .exec();

    // If no residents found by personId, check by phone number and link them
    if (activeResidents.length === 0) {
      const residentsByPhone = await this.residentModel
        .find({
          phone: normalizedMobile,
          status: 'ACTIVE',
          archived: { $ne: true },
        })
        .populate('tenantId')
        .exec();

      if (residentsByPhone.length === 0) {
        throw new ForbiddenException(
          'No active residency found. Please contact your PG administrator.',
        );
      }

      // Link all residents with this phone to the person
      await this.residentModel.updateMany(
        {
          phone: normalizedMobile,
          status: 'ACTIVE',
          archived: { $ne: true },
        },
        {
          $set: { personId: person._id },
        },
      ).exec();

      // Update person name from first resident if it's still placeholder
      if (person.name === 'Resident' && residentsByPhone[0].name) {
        person.name = residentsByPhone[0].name;
        if (residentsByPhone[0].email) {
          person.email = residentsByPhone[0].email;
        }
        await person.save();
      }

      // Re-fetch residents now that they're linked
      activeResidents = await this.residentModel
        .find({
          personId: person._id,
          status: 'ACTIVE',
          archived: { $ne: true },
        })
        .populate('tenantId')
        .exec();
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
    let person = await this.personModel.findOne({ mobile: normalizedMobile }).exec();
    if (!person) {
      throw new UnauthorizedException('Person not found. Please request OTP first.');
    }

    // Find active residents by personId
    let query: any = {
      personId: person._id,
      status: 'ACTIVE',
      archived: { $ne: true },
    };

    // If tenantId is provided, filter by it
    if (tenantId) {
      query.tenantId = new Types.ObjectId(tenantId);
    }

    let activeResidents = await this.residentModel
      .find(query)
      .populate('tenantId')
      .populate('roomId')
      .populate('bedId')
      .exec();

    // If no residents found by personId, check by phone and link them
    if (activeResidents.length === 0) {
      const phoneQuery: any = {
        phone: normalizedMobile,
        status: 'ACTIVE',
        archived: { $ne: true },
      };
      if (tenantId) {
        phoneQuery.tenantId = new Types.ObjectId(tenantId);
      }

      const residentsByPhone = await this.residentModel
        .find(phoneQuery)
        .populate('tenantId')
        .populate('roomId')
        .populate('bedId')
        .exec();

      if (residentsByPhone.length === 0) {
        throw new ForbiddenException(
          'No active residency found.',
        );
      }

      // Link all residents with this phone to the person
      await this.residentModel.updateMany(
        phoneQuery,
        {
          $set: { personId: person._id },
        },
      ).exec();

      // Update person name from first resident if it's still placeholder
      if (person.name === 'Resident' && residentsByPhone[0].name) {
        person.name = residentsByPhone[0].name;
        if (residentsByPhone[0].email) {
          person.email = residentsByPhone[0].email;
        }
        await person.save();
      }

      // Re-fetch residents now that they're linked
      activeResidents = await this.residentModel
        .find(query)
        .populate('tenantId')
        .populate('roomId')
        .populate('bedId')
        .exec();
    }

    // Check feature flag for each tenant AND resident's portalEnabled flag
    const validResidents = [];
    for (const resident of activeResidents) {
      const residentTenantId = (resident.tenantId as any)._id?.toString() || (resident.tenantId as any).id?.toString();
      if (residentTenantId) {
        const tenantFeatureEnabled = await this.featureFlagService.isFeatureEnabled(
          residentTenantId,
          FeatureKey.RESIDENT_PORTAL,
        );
        // Both tenant feature flag AND resident's portalEnabled must be true
        const residentPortalEnabled = (resident as any).portalEnabled !== false; // Default to true if not set (backward compatibility)
        if (tenantFeatureEnabled && residentPortalEnabled) {
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
      throw new UnauthorizedException('Person not found. Please request OTP first.');
    }

    // Find active resident for this tenant by personId
    let resident = await this.residentModel
      .findOne({
        personId: person._id,
        tenantId: new Types.ObjectId(tenantId),
        status: 'ACTIVE',
        archived: { $ne: true },
      })
      .populate('tenantId')
      .populate('roomId')
      .populate('bedId')
      .exec();

    // If not found by personId, check by phone and link
    if (!resident) {
      resident = await this.residentModel
        .findOne({
          phone: normalizedMobile,
          tenantId: new Types.ObjectId(tenantId),
          status: 'ACTIVE',
          archived: { $ne: true },
        })
        .populate('tenantId')
        .populate('roomId')
        .populate('bedId')
        .exec();

      if (!resident) {
        throw new ForbiddenException(
          'No active residency found for this PG.',
        );
      }

      // Link resident to person
      resident.personId = person._id;
      await resident.save();

      // Update person name if it's still placeholder
      if (person.name === 'Resident' && resident.name) {
        person.name = resident.name;
        if (resident.email) {
          person.email = resident.email;
        }
        await person.save();
      }
    }

    if (!resident) {
      throw new ForbiddenException(
        'No active residency found for this PG.',
      );
    }

    // Check tenant feature flag AND resident's portalEnabled
    const tenantFeatureEnabled = await this.featureFlagService.isFeatureEnabled(
      tenantId,
      FeatureKey.RESIDENT_PORTAL,
    );
    if (!tenantFeatureEnabled) {
      throw new ForbiddenException(
        'Resident portal is not enabled for this PG.',
      );
    }

    // Check if resident has portal access enabled
    const residentPortalEnabled = (resident as any).portalEnabled !== false; // Default to true if not set (backward compatibility)
    if (!residentPortalEnabled) {
      throw new ForbiddenException(
        'Portal access is disabled for your account. Please contact your administrator.',
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

      if (!resident || resident.status !== 'ACTIVE' || resident.archived) {
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

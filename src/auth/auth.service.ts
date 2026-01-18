import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { PlansService } from '../super-admin/plans/plans.service';
import { FeatureFlagService } from '../common/services/feature-flag.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SignupDto } from './dto/signup.dto';
import { UserRole } from '../common/decorators/roles.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private plansService: PlansService,
    private featureFlagService: FeatureFlagService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private redis: any,
  ) {}

  async validateUser(email: string, password: string, tenantId?: string) {
    // Normalize email (lowercase and trim)
    const normalizedEmail = email.toLowerCase().trim();
    
    // If tenantId is provided, validate within that tenant
    // Otherwise, find user globally and get tenantId from user record
    const user = tenantId 
      ? await this.usersService.findByEmail(normalizedEmail, tenantId)
      : await this.usersService['userModel'].findOne({ 
          email: normalizedEmail 
        }).exec();
    
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reject Super Admin users on tenant login endpoint
    if (user.role === 'SUPER_ADMIN') {
      throw new UnauthorizedException('Super Admin must use /admin/auth/login');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(loginDto: LoginDto) {
    // Tenant login - validate tenant slug matches user's tenant
    // This endpoint is ONLY for tenant users (Owner, Manager, Staff)
    // Super Admin must use /admin/auth/login
    
    // Validate user by email/password (without tenantId to find user globally)
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    // Get tenantId from user record
    if (!user.tenantId) {
      throw new UnauthorizedException('User is not associated with a tenant');
    }

    const tenantId = user.tenantId.toString();

    // Fetch tenant details to validate slug and include in token payload
    const tenant = await this.tenantsService.findOne(tenantId);
    if (!tenant) {
      throw new UnauthorizedException('Tenant not found');
    }

    // CRITICAL: Validate tenant slug from frontend matches user's tenant slug
    // This ensures user can only login from their own tenant URL
    if (tenant.slug !== loginDto.tenantSlug) {
      throw new UnauthorizedException(
        `Invalid tenant. Please login from your tenant URL: ${tenant.slug}.yourdomain.com`
      );
    }

    // Validate tenant is active
    if (tenant.status !== 'active') {
      throw new ForbiddenException(`Tenant is ${tenant.status}. Access denied.`);
    }

    // Check subscription status (if subscription module is available)
    // Note: Subscription check is also done in middleware for subsequent requests
    // This is a basic check during login

    const payload = {
      userId: user._id.toString(),
      tenantId: user.tenantId.toString(),
      tenantSlug: tenant.slug,
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

  async register(registerDto: RegisterDto) {
    // Get tenant by slug from request body
    const tenant = await this.tenantsService.findBySlug(registerDto.tenantSlug);
    if (!tenant) {
      throw new BadRequestException(`Tenant with slug '${registerDto.tenantSlug}' not found`);
    }

    if (tenant.status !== 'active') {
      throw new ForbiddenException(`Tenant is ${tenant.status}. Registration is not allowed.`);
    }

    const tenantId = tenant._id.toString();

    const existingUser = await this.usersService.findByEmail(
      registerDto.email,
      tenantId,
    );
    if (existingUser) {
      throw new BadRequestException('User already exists in this tenant');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      email: registerDto.email,
      password: hashedPassword,
      name: registerDto.name,
      tenantId,
      role: registerDto.role || UserRole.STAFF,
    });

    return this.login(
      { email: registerDto.email, password: registerDto.password, tenantSlug: registerDto.tenantSlug },
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

      // Include tenantSlug in new access token (from refresh token payload)
      const newPayload = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        tenantSlug: payload.tenantSlug, // Include tenant slug from refresh token
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

  /**
   * Tenant self-signup - creates tenant, owner user, and assigns default plan
   * Only allowed from root domain (no tenant subdomain)
   * Tenant slug is provided by frontend (admin or tenant during signup)
   */
  async signup(signupDto: SignupDto, requestHost: string): Promise<{ tenantSlug: string; message: string }> {
    // Validate signup is from root domain (not tenant subdomain)
    const isRootDomain = this.isRootDomain(requestHost);
    if (!isRootDomain) {
      throw new BadRequestException('Signup is only allowed from the root domain.');
    }

    // Use tenant slug from request body (provided by frontend)
    const tenantSlug = signupDto.tenantSlug.toLowerCase().trim();
    
    // Validate slug format
    if (!tenantSlug || tenantSlug.length < 2) {
      throw new BadRequestException('Tenant slug must contain at least 2 characters.');
    }

    if (tenantSlug.length > 63) {
      throw new BadRequestException('Tenant slug must be 63 characters or less (DNS subdomain limit).');
    }

    // Validate slug format (alphanumeric and hyphens only)
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(tenantSlug)) {
      throw new BadRequestException('Tenant slug can only contain lowercase letters, numbers, and hyphens. It must start and end with alphanumeric characters.');
    }

    // Check for reserved slugs
    const reservedSlugs = ['admin', 'api', 'www', 'app', 'mail', 'ftp', 'localhost', 'test', 'staging', 'dev', 'prod', 'www2', 'www3'];
    if (reservedSlugs.includes(tenantSlug)) {
      throw new BadRequestException('This tenant slug is reserved. Please choose a different slug.');
    }

    // Check if slug is already taken
    const existingTenant = await this.tenantsService.findBySlug(tenantSlug);
    if (existingTenant) {
      throw new BadRequestException('This tenant slug is already taken. Please choose a different slug.');
    }

    const finalSlug = tenantSlug;

    // Get default plan (lowest price active plan, or 'free' plan)
    const defaultPlan = await this.plansService.findDefaultPlan();
    if (!defaultPlan) {
      throw new BadRequestException('No default plan available. Please contact support.');
    }

    // Check if owner email already exists globally (prevent duplicate accounts)
    // Note: In multi-tenant, same email can exist in different tenants, but for signup we check globally
    // SECURITY: Use generic error message to prevent email enumeration
    const normalizedEmail = signupDto.ownerEmail.toLowerCase().trim();
    const existingUser = await this.usersService['userModel']
      .findOne({ email: normalizedEmail })
      .exec();
    
    if (existingUser) {
      // Generic error to prevent email enumeration attacks
      throw new BadRequestException('Unable to create account. Please try again or contact support.');
    }

    try {
      // Create tenant (unique index will prevent race condition duplicates)
      const tenant = await this.tenantsService.create({
        name: signupDto.tenantName.trim(),
        slug: finalSlug,
        plan: defaultPlan.slug,
        status: 'active',
        limits: {
          rooms: defaultPlan.limits?.rooms ?? -1,
          residents: defaultPlan.limits?.residents ?? -1,
          staff: defaultPlan.limits?.staff ?? -1,
        },
      });

      // Get tenant ID (handle both Document and plain object)
      const tenantId = (tenant as any)._id?.toString() || (tenant as any).id?.toString();
      if (!tenantId) {
        throw new BadRequestException('Failed to create tenant. Please try again.');
      }

      // Convert tenant to document if needed for type safety
      const tenantDoc = tenant as any;

      try {
        // Assign plan to tenant (creates subscription and enables features)
        await this.plansService.assignPlanToTenant(tenantId, {
          planId: defaultPlan._id.toString(),
          startDate: new Date().toISOString(),
        });

        try {
          // Create owner user
          const hashedPassword = await bcrypt.hash(signupDto.password, 10);
          await this.usersService.create({
            name: signupDto.ownerName.trim(),
            email: normalizedEmail, // Use already normalized email
            password: hashedPassword,
            role: UserRole.OWNER,
            tenantId: tenantId,
          });

          return {
            tenantSlug: finalSlug,
            message: 'Tenant created successfully. Please login at your tenant subdomain.',
          };
        } catch (userError: any) {
          // If user creation fails, tenant and subscription exist but no owner
          // SECURITY: Log detailed error but return generic message
          console.error('[Signup Error] Failed to create owner user:', {
            tenantId: tenantId,
            email: normalizedEmail,
            error: userError.message,
          });
          // Generic error to prevent information leakage
          throw new BadRequestException('Account creation failed. Please contact support with your email address.');
        }
      } catch (planError: any) {
        // If plan assignment fails, tenant exists but has no subscription
        console.error('[Signup Error] Failed to assign plan:', {
          tenantId: tenantId,
          error: planError.message,
        });
        throw new BadRequestException('Account creation failed. Please contact support.');
      }
    } catch (tenantError: any) {
      // Check if it's a duplicate key error (race condition or duplicate slug)
      if (tenantError.code === 11000 || tenantError.message?.includes('duplicate') || tenantError.message?.includes('E11000')) {
        // Generic error for duplicate - don't reveal which field
        throw new BadRequestException('This tenant name is already taken. Please choose a different name.');
      }
      // For other errors, log but return generic message
      console.error('[Signup Error] Failed to create tenant:', {
        tenantName: signupDto.tenantName,
        error: tenantError.message,
      });
      throw new BadRequestException('Account creation failed. Please try again or contact support.');
    }
  }

  /**
   * Check if request is from root domain (not tenant subdomain)
   * SECURITY: Validates host header to prevent subdomain bypass
   */
  private isRootDomain(host: string): boolean {
    if (!host || typeof host !== 'string') return false;
    
    // Sanitize host (remove port if present)
    const hostWithoutPort = host.split(':')[0].toLowerCase().trim();
    
    // Check if it's an IP address (localhost testing - allow for development)
    const isIPAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostWithoutPort);
    if (isIPAddress) {
      // Only allow localhost IPs (127.0.0.1, 192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const isLocalIP = /^(127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostWithoutPort);
      return isLocalIP;
    }
    
    // Check if it's localhost (development)
    if (hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1') {
      return true;
    }
    
    // Extract subdomain
    const parts = hostWithoutPort.split('.');
    if (parts.length < 2) {
      // Invalid host format
      return false;
    }
    
    if (parts.length === 2) {
      // No subdomain (e.g., nivaasone.com) - this is root domain
      return true;
    }
    
    const subdomain = parts[0];
    // Root domain if subdomain is www, api, or empty
    // Reject all other subdomains to prevent bypass
    const allowedSubdomains = ['www', 'api', ''];
    return allowedSubdomains.includes(subdomain);
  }

  /**
   * Generate URL-friendly slug from tenant name
   * SECURITY: Validates and sanitizes input to prevent injection
   */
  private generateSlug(name: string): string {
    if (!name || typeof name !== 'string') {
      return '';
    }
    
    // Sanitize: lowercase, trim, remove special chars except spaces and hyphens
    let slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Ensure minimum length
    if (slug.length < 2) {
      return '';
    }
    
    // Limit maximum length (DNS subdomain limit is 63 chars)
    if (slug.length > 63) {
      slug = slug.substring(0, 63);
      slug = slug.replace(/-$/, ''); // Remove trailing hyphen if cut
    }
    
    return slug;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantsService } from '../../tenants/tenants.service';
import { UsersService } from '../../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CreateTenantDto } from '../../tenants/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../tenants/dto/update-tenant.dto';
import { UserRole } from '../../common/decorators/roles.decorator';

@Injectable()
export class SuperAdminTenantsService {
  constructor(
    private tenantsService: TenantsService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async create(createTenantDto: CreateTenantDto) {
    // Extract owner info from DTO
    const { ownerEmail, ownerPassword, ownerName, ...tenantData } = createTenantDto;

    // Validate owner fields are provided
    if (!ownerEmail || !ownerPassword || !ownerName) {
      throw new BadRequestException('Owner email, password, and name are required when creating a tenant');
    }

    // Create tenant first
    const tenant = await this.tenantsService.create(tenantData) as any;

    // Check if owner user already exists
    const existingUser = await this.usersService.findByEmail(ownerEmail, tenant._id.toString());
    if (existingUser) {
      throw new BadRequestException('User with this email already exists in this tenant');
    }

    // Create owner user for the tenant
    await this.usersService.create({
      email: ownerEmail,
      password: ownerPassword,
      name: ownerName,
      role: UserRole.OWNER,
      tenantId: tenant._id.toString(),
    });

    return tenant;
  }

  async findAll(status?: string) {
    const tenants = await this.tenantsService.findAll();
    if (status) {
      return tenants.filter((t: any) => t.status === status);
    }
    return tenants;
  }

  async findOne(id: string) {
    const tenant = await this.tenantsService.findOne(id) as any;
    
    // Get tenant stats
    const users = await this.usersService.findAll(id);
    
    const tenantObj = tenant.toObject ? tenant.toObject() : tenant;
    return {
      ...tenantObj,
      stats: {
        totalUsers: users.length,
        activeUsers: users.filter((u: any) => u.isActive).length,
      },
    };
  }

  async update(id: string, updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  async suspend(id: string) {
    return this.tenantsService.update(id, { status: 'suspended' } as UpdateTenantDto);
  }

  async activate(id: string) {
    return this.tenantsService.update(id, { status: 'active' } as UpdateTenantDto);
  }

  async remove(id: string) {
    // Check if tenant has users
    const users = await this.usersService.findAll(id);
    if (users.length > 0) {
      throw new BadRequestException(
        'Cannot delete tenant with existing users. Please remove users first.',
      );
    }
    return this.tenantsService.remove(id);
  }

  async getPlatformStats() {
    const tenants = await this.tenantsService.findAll();
    const activeTenants = tenants.filter((t: any) => t.status === 'active');
    const suspendedTenants = tenants.filter((t: any) => t.status === 'suspended');

    // Get total users across all tenants
    let totalUsers = 0;
    for (const tenant of tenants) {
      const users = await this.usersService.findAll((tenant as any)._id.toString());
      totalUsers += users.length;
    }

    return {
      totalTenants: tenants.length,
      activeTenants: activeTenants.length,
      suspendedTenants: suspendedTenants.length,
      totalUsers,
      plans: {
        free: tenants.filter((t: any) => t.plan === 'free').length,
        pro: tenants.filter((t: any) => t.plan === 'pro').length,
        enterprise: tenants.filter((t: any) => t.plan === 'enterprise').length,
      },
    };
  }

  async getImpersonationToken(tenantId: string) {
    const tenant = await this.tenantsService.findOne(tenantId) as any;
    
    // Find first OWNER user in tenant
    const users = await this.usersService.findAll(tenantId);
    const owner = users.find((u: any) => u.role === 'OWNER') as any;
    
    if (!owner) {
      throw new NotFoundException('No owner found for this tenant');
    }

    // Create impersonation token (same as regular user token but with impersonation flag)
    const payload = {
      userId: owner._id.toString(),
      tenantId: tenant._id.toString(),
      role: owner.role,
      email: owner.email,
      impersonatedBy: 'SUPER_ADMIN', // Flag for impersonation
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: '1h', // Shorter expiry for impersonation
    });

    return {
      token,
      tenant: {
        id: tenant._id,
        name: tenant.name,
        slug: tenant.slug,
      },
      user: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
        role: owner.role,
      },
      expiresIn: '1h',
    };
  }
}

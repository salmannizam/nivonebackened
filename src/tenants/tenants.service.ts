import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tenant, TenantDocument } from './schemas/tenant.schema';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
  ) {}

  async create(createTenantDto: CreateTenantDto): Promise<Tenant> {
    // Exclude owner fields from tenant document (they're only for user creation)
    const { ownerEmail, ownerPassword, ownerName, ...tenantData } = createTenantDto;
    const tenant = new this.tenantModel(tenantData);
    return tenant.save();
  }

  async findAll(): Promise<Tenant[]> {
    return this.tenantModel.find().exec();
  }

  async findOne(id: string): Promise<Tenant> {
    const tenant = await this.tenantModel.findById(id).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const tenant = await this.tenantModel.findOne({ slug }).exec();
    return tenant;
  }

  async update(id: string, updateTenantDto: UpdateTenantDto): Promise<Tenant> {
    const tenant = await this.tenantModel
      .findByIdAndUpdate(id, updateTenantDto, { new: true })
      .exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async remove(id: string): Promise<void> {
    const result = await this.tenantModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Tenant not found');
    }
  }

  async checkFeature(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.findOne(tenantId);
    return tenant.features[feature] || false;
  }

  async checkLimit(tenantId: string, limit: string): Promise<number> {
    const tenant = await this.findOne(tenantId);
    return tenant.limits[limit] || 0;
  }
}

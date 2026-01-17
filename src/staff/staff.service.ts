import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Staff, StaffDocument } from './schemas/staff.schema';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(@InjectModel(Staff.name) private staffModel: Model<StaffDocument>) {}

  async create(createStaffDto: CreateStaffDto, tenantId: string) {
    // Check if staff with same phone already exists in this tenant
    const existing = await this.staffModel.findOne({
      tenantId,
      phone: createStaffDto.phone,
    });

    if (existing) {
      throw new BadRequestException('Staff with this phone number already exists');
    }

    const staff = new this.staffModel({
      ...createStaffDto,
      tenantId,
    });

    return staff.save();
  }

  async findAll(
    tenantId: string,
    filters?: {
      role?: string;
      isActive?: boolean;
      shift?: string;
      search?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.role) {
      query.role = filters.role;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    if (filters?.shift) {
      query.shift = filters.shift;
    }

    let staff = await this.staffModel.find(query).sort({ name: 1 }).exec();
    
    // Apply search filter (name, phone, email)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      staff = staff.filter((s: any) => {
        const staffObj = s.toObject ? s.toObject() : s;
        return (
          staffObj.name?.toLowerCase().includes(searchLower) ||
          staffObj.phone?.includes(filters.search) ||
          staffObj.email?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return staff;
  }

  async findOne(id: string, tenantId: string) {
    const staff = await this.staffModel
      .findOne({ _id: id, tenantId })
      .exec();

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto, tenantId: string) {
    const staff = await this.staffModel
      .findOneAndUpdate({ _id: id, tenantId }, updateStaffDto, { new: true })
      .exec();

    if (!staff) {
      throw new NotFoundException('Staff not found');
    }

    return staff;
  }

  async remove(id: string, tenantId: string) {
    const result = await this.staffModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();

    if (!result) {
      throw new NotFoundException('Staff not found');
    }
  }

  async getStats(tenantId: string) {
    const total = await this.staffModel.countDocuments({ tenantId });
    const active = await this.staffModel.countDocuments({
      tenantId,
      isActive: true,
    });
    const byRole = await this.staffModel.aggregate([
      { $match: { tenantId } },
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);

    return {
      total,
      active,
      inactive: total - active,
      byRole: byRole.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
    };
  }
}

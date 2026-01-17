import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SuperAdmin, SuperAdminDocument } from './schemas/super-admin.schema';
import * as bcrypt from 'bcrypt';
import { CreateSuperAdminDto } from './dto/create-super-admin.dto';
import { UpdateSuperAdminDto } from './dto/update-super-admin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    @InjectModel(SuperAdmin.name)
    private superAdminModel: Model<SuperAdminDocument>,
  ) {}

  async create(createSuperAdminDto: CreateSuperAdminDto): Promise<SuperAdmin> {
    const existing = await this.superAdminModel.findOne({
      email: createSuperAdminDto.email,
    });

    if (existing) {
      throw new BadRequestException('Super Admin already exists');
    }

    const hashedPassword = await bcrypt.hash(createSuperAdminDto.password, 10);
    const superAdmin = new this.superAdminModel({
      ...createSuperAdminDto,
      password: hashedPassword,
    });
    return superAdmin.save();
  }

  async findAll(): Promise<SuperAdmin[]> {
    return this.superAdminModel.find().select('-password').exec();
  }

  async findOne(id: string): Promise<SuperAdmin> {
    const superAdmin = await this.superAdminModel
      .findById(id)
      .select('-password')
      .exec();
    if (!superAdmin) {
      throw new NotFoundException('Super Admin not found');
    }
    return superAdmin;
  }

  async findByEmail(email: string): Promise<SuperAdminDocument> {
    const superAdmin = await this.superAdminModel.findOne({ email }).exec();
    if (!superAdmin) {
      throw new NotFoundException('Super Admin not found');
    }
    return superAdmin;
  }

  async validatePassword(
    email: string,
    password: string,
  ): Promise<SuperAdminDocument> {
    const superAdmin = await this.findByEmail(email);
    const isPasswordValid = await bcrypt.compare(password, superAdmin.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid credentials');
    }
    return superAdmin;
  }

  async update(
    id: string,
    updateSuperAdminDto: UpdateSuperAdminDto,
  ): Promise<SuperAdmin> {
    if (updateSuperAdminDto.password) {
      updateSuperAdminDto.password = await bcrypt.hash(
        updateSuperAdminDto.password,
        10,
      );
    }
    const superAdmin = await this.superAdminModel
      .findByIdAndUpdate(id, updateSuperAdminDto, { new: true })
      .select('-password')
      .exec();
    if (!superAdmin) {
      throw new NotFoundException('Super Admin not found');
    }
    return superAdmin;
  }

  async remove(id: string): Promise<void> {
    const result = await this.superAdminModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Super Admin not found');
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.superAdminModel
      .findByIdAndUpdate(id, { lastLogin: new Date() })
      .exec();
  }
}

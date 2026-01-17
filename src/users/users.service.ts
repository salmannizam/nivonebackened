import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Check if user already exists in this tenant
    const existing = await this.userModel.findOne({
      email: createUserDto.email,
      tenantId: createUserDto.tenantId,
    });

    if (existing) {
      throw new BadRequestException('User already exists in this tenant');
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
    });
    return user.save();
  }

  async findAll(
    tenantId: string,
    filters?: { role?: string; search?: string },
  ): Promise<User[]> {
    const query: any = { tenantId };
    if (filters?.role) {
      query.role = filters.role;
    }
    
    let users = await this.userModel.find(query).select('-password').exec();
    
    // Apply search filter (name, email)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      users = users.filter((user: any) => {
        const userObj = user.toObject ? user.toObject() : user;
        return (
          userObj.name?.toLowerCase().includes(searchLower) ||
          userObj.email?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return users;
  }

  async findOne(id: string, tenantId: string): Promise<User> {
    const user = await this.userModel
      .findOne({ _id: id, tenantId })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string, tenantId: string): Promise<UserDocument | null> {
    const user = await this.userModel
      .findOne({ email, tenantId })
      .exec();
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto & { currentPassword?: string },
    tenantId: string,
  ): Promise<User> {
    // If password is being updated, verify current password first
    const updateData: any = { ...updateUserDto };
    
    if (updateUserDto.password) {
      // If currentPassword is provided, verify it
      if (updateUserDto.currentPassword) {
        const user = await this.userModel.findOne({ _id: id, tenantId }).exec();
        if (!user) {
          throw new NotFoundException('User not found');
        }
        
        const isPasswordValid = await bcrypt.compare(
          updateUserDto.currentPassword,
          user.password,
        );
        
        if (!isPasswordValid) {
          throw new BadRequestException('Current password is incorrect');
        }
      }
      
      // Hash the new password
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }
    
    // Remove currentPassword from update data (it's not a field in the schema)
    delete updateData.currentPassword;

    const user = await this.userModel
      .findOneAndUpdate({ _id: id, tenantId }, updateData, { new: true })
      .select('-password')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.userModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }
}

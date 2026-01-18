import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User } from '../common/decorators/user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Get current user's profile (no feature check required)
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@User() user: any, @TenantId() tenantId: string) {
    const userId = user.userId || user._id || user.id;
    return this.usersService.findOne(userId, tenantId);
  }

  /**
   * Update current user's profile (no feature check required)
   */
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateCurrentUser(
    @User() currentUser: any,
    @Body() updateUserDto: UpdateUserDto,
    @TenantId() tenantId: string,
  ) {
    const userId = currentUser.userId || currentUser._id || currentUser.id;
    // Users can only update their own profile (name, phone, password)
    // They cannot change their role or isActive status
    const { role, isActive, ...safeUpdateDto } = updateUserDto;
    return this.usersService.update(userId, safeUpdateDto, tenantId);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Features(FeatureKey.USER_MANAGEMENT)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  create(@Body() createUserDto: CreateUserDto, @TenantId() tenantId: string) {
    return this.usersService.create({ ...createUserDto, tenantId });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Features(FeatureKey.USER_MANAGEMENT)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findAll(
    @Query('role') role: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.usersService.findAll(tenantId, { role, search });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Features(FeatureKey.USER_MANAGEMENT)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.findOne(id, tenantId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Features(FeatureKey.USER_MANAGEMENT)
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @TenantId() tenantId: string,
    @User() currentUser: any,
  ) {
    const currentUserId = currentUser.userId || currentUser._id || currentUser.id;
    
    // Prevent users from modifying their own role or deactivating themselves
    if (currentUserId && currentUserId.toString() === id.toString()) {
      if (updateUserDto.role !== undefined) {
        throw new ForbiddenException(
          'You cannot change your own role. Please ask another administrator to update your role.',
        );
      }
      if (updateUserDto.isActive === false) {
        throw new ForbiddenException(
          'You cannot deactivate your own account. Please ask another administrator to deactivate your account.',
        );
      }
      // Allow updating other fields (name, email, password) for own profile
      const { role, isActive, ...safeUpdateDto } = updateUserDto;
      return this.usersService.update(id, safeUpdateDto, tenantId);
    }
    
    // Only OWNER can change user roles or update/deactivate OWNER users
    // MANAGER can update name, email, password, and activate/deactivate non-OWNER users
    const userRole = currentUser.role;
    
    if (userRole !== UserRole.OWNER) {
      // MANAGER restrictions
      if (updateUserDto.role !== undefined) {
        throw new ForbiddenException('Only OWNER can change user roles');
      }
      
      // Check if trying to update an OWNER user
      const targetUser = await this.usersService.findOne(id, tenantId);
      if (targetUser.role === UserRole.OWNER) {
        throw new ForbiddenException('Only OWNER can update or deactivate OWNER users');
      }
      
      // MANAGER can update non-OWNER users (but not their role)
      const { role, ...safeUpdateDto } = updateUserDto;
      return this.usersService.update(id, safeUpdateDto, tenantId);
    }
    
    // OWNER can update anything for other users
    return this.usersService.update(id, updateUserDto, tenantId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
  @Features(FeatureKey.USER_MANAGEMENT)
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.usersService.remove(id, tenantId);
  }
}

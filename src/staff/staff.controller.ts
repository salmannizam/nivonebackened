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
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('staff')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.STAFF)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  create(@Body() createStaffDto: CreateStaffDto, @TenantId() tenantId: string) {
    return this.staffService.create(createStaffDto, tenantId);
  }

  @Get()
  findAll(
    @Query('role') role: string,
    @Query('isActive') isActive: string,
    @Query('shift') shift: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.staffService.findAll(tenantId, {
      role,
      isActive: isActiveBool,
      shift,
      search,
    });
  }

  @Get('stats')
  getStats(@TenantId() tenantId: string) {
    return this.staffService.getStats(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.staffService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateStaffDto: UpdateStaffDto,
    @TenantId() tenantId: string,
  ) {
    return this.staffService.update(id, updateStaffDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.staffService.remove(id, tenantId);
  }
}

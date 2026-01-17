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
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('complaints')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.COMPLAINTS)
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(@Body() createComplaintDto: CreateComplaintDto, @TenantId() tenantId: string) {
    return this.complaintsService.create(createComplaintDto, tenantId);
  }

  @Get()
  findAll(
    @Query('status') status: string,
    @Query('priority') priority: string,
    @Query('residentId') residentId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('search') search: string,
    @TenantId() tenantId: string,
  ) {
    return this.complaintsService.findAll(tenantId, {
      status,
      priority,
      residentId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.complaintsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateComplaintDto: UpdateComplaintDto,
    @TenantId() tenantId: string,
  ) {
    return this.complaintsService.update(id, updateComplaintDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.complaintsService.remove(id, tenantId);
  }
}

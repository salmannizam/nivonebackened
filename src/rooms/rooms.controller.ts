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
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { TenantId } from '../common/decorators/tenant.decorator';

@Controller('rooms')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.ROOMS)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Body() createRoomDto: CreateRoomDto, @TenantId() tenantId: string) {
    return this.roomsService.create(createRoomDto, tenantId);
  }

  @Get()
  findAll(
    @Query('buildingId') buildingId: string,
    @Query('search') search: string,
    @Query('capacityMin') capacityMin: string,
    @Query('capacityMax') capacityMax: string,
    @Query('occupiedMin') occupiedMin: string,
    @Query('occupiedMax') occupiedMax: string,
    @TenantId() tenantId: string,
  ) {
    return this.roomsService.findAll(tenantId, {
      buildingId,
      search,
      capacityMin: capacityMin ? Number(capacityMin) : undefined,
      capacityMax: capacityMax ? Number(capacityMax) : undefined,
      occupiedMin: occupiedMin ? Number(occupiedMin) : undefined,
      occupiedMax: occupiedMax ? Number(occupiedMax) : undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @TenantId() tenantId: string): Promise<any> {
    return this.roomsService.findOne(id, tenantId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRoomDto: UpdateRoomDto,
    @TenantId() tenantId: string,
  ): Promise<any> {
    return this.roomsService.update(id, updateRoomDto, tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @TenantId() tenantId: string) {
    return this.roomsService.remove(id, tenantId);
  }
}

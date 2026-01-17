import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { PersonalNotesService } from './personal-notes.service';
import { CreatePersonalNoteDto } from './dto/create-personal-note.dto';
import { UpdatePersonalNoteDto } from './dto/update-personal-note.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant.decorator';
import { User } from '../common/decorators/user.decorator';
import { FeatureGuard } from '../common/guards/feature.guard';
import { Features } from '../common/decorators/feature.decorator';
import { FeatureKey } from '../common/schemas/feature-flag.schema';

@Controller('personal-notes')
@UseGuards(JwtAuthGuard, FeatureGuard)
@Features(FeatureKey.PERSONAL_NOTES)
export class PersonalNotesController {
  constructor(private readonly personalNotesService: PersonalNotesService) {}

  @Post()
  async create(
    @User() user: any,
    @TenantId() tenantId: string,
    @Body() createNoteDto: CreatePersonalNoteDto,
  ) {
    const userId = user._id || user.id || user.userId;
    return this.personalNotesService.create(userId, tenantId, createNoteDto);
  }

  @Get()
  async findAll(@User() user: any, @TenantId() tenantId: string) {
    const userId = user._id || user.id || user.userId;
    return this.personalNotesService.findAll(userId, tenantId);
  }

  @Get(':id')
  async findOne(
    @User() user: any,
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    const userId = user._id || user.id || user.userId;
    return this.personalNotesService.findOne(userId, tenantId, id);
  }

  @Patch(':id')
  async update(
    @User() user: any,
    @TenantId() tenantId: string,
    @Param('id') id: string,
    @Body() updateNoteDto: UpdatePersonalNoteDto,
  ) {
    const userId = user._id || user.id || user.userId;
    return this.personalNotesService.update(userId, tenantId, id, updateNoteDto);
  }

  @Delete(':id')
  async remove(
    @User() user: any,
    @TenantId() tenantId: string,
    @Param('id') id: string,
  ) {
    const userId = user._id || user.id || user.userId;
    await this.personalNotesService.remove(userId, tenantId, id);
    return { message: 'Note deleted successfully' };
  }

  @Get('stats/pinned-count')
  async getPinnedCount(@User() user: any, @TenantId() tenantId: string) {
    const userId = user._id || user.id || user.userId;
    const count = await this.personalNotesService.getPinnedCount(userId, tenantId);
    return { count, max: 5 };
  }
}

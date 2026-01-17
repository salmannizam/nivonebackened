import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { TenantId } from '../common/decorators/tenant.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
  constructor(
    private readonly tenantsService: TenantsService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @Roles(UserRole.OWNER)
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @Roles(UserRole.OWNER)
  findAll() {
    return this.tenantsService.findAll();
  }

  @Get('current')
  getCurrent(@TenantId() tenantId: string) {
    return this.tenantsService.findOne(tenantId);
  }

  @Patch('current')
  @Roles(UserRole.OWNER)
  updateCurrent(@TenantId() tenantId: string, @Body() updateTenantDto: UpdateTenantDto) {
    const appMode = this.configService.get('APP_MODE', 'SELF_HOSTED');
    
    // In SaaS mode, tenant owners cannot update features (only super admin can)
    // In self-hosted mode, owner can update their own tenant features
    if (appMode === 'SAAS' && updateTenantDto.features) {
      throw new ForbiddenException(
        'Feature flags can only be updated by Super Admin in SaaS mode. Please contact platform administrator.',
      );
    }
    
    return this.tenantsService.update(tenantId, updateTenantDto);
  }

  @Get(':id')
  @Roles(UserRole.OWNER)
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.OWNER)
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @Roles(UserRole.OWNER)
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }
}

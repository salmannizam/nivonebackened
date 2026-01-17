import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { SuperAdminTenantsService } from './super-admin-tenants.service';
import { CreateTenantDto } from '../../tenants/dto/create-tenant.dto';
import { UpdateTenantDto } from '../../tenants/dto/update-tenant.dto';
import { SuperAdminAuthGuard } from '../../common/guards/super-admin-auth.guard';

@Controller('admin/tenants')
@UseGuards(SuperAdminAuthGuard)
export class SuperAdminTenantsController {
  constructor(
    private readonly superAdminTenantsService: SuperAdminTenantsService,
  ) {}

  @Post()
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.superAdminTenantsService.create(createTenantDto);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    return this.superAdminTenantsService.findAll(status);
  }

  @Get('stats')
  getStats() {
    return this.superAdminTenantsService.getPlatformStats();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superAdminTenantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.superAdminTenantsService.update(id, updateTenantDto);
  }

  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.superAdminTenantsService.suspend(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.superAdminTenantsService.activate(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.superAdminTenantsService.remove(id);
  }

  @Post(':id/impersonate')
  impersonate(@Param('id') id: string) {
    return this.superAdminTenantsService.getImpersonationToken(id);
  }
}

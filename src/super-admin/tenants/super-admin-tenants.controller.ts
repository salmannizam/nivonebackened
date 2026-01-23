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
  Response,
} from '@nestjs/common';
import { Response as ExpressResponse } from 'express';
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

  // Specific routes must come before generic :id route
  @Post(':id/suspend')
  suspend(@Param('id') id: string) {
    return this.superAdminTenantsService.suspend(id);
  }

  @Post(':id/activate')
  activate(@Param('id') id: string) {
    return this.superAdminTenantsService.activate(id);
  }

  @Post(':id/change-owner-password')
  async changeOwnerPassword(
    @Param('id') id: string,
    @Body() body: { password: string },
  ) {
    return this.superAdminTenantsService.changeOwnerPassword(id, body.password);
  }

  @Post(':id/impersonate')
  async impersonate(@Param('id') id: string, @Response() res: ExpressResponse) {
    const result = await this.superAdminTenantsService.getImpersonationToken(id);
    
    // Set HTTP-only cookies for impersonation (same as regular login)
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Must be true for sameSite: 'none' (cross-origin)
      sameSite: 'none' as const, // Required for cross-origin cookies
      maxAge: 60 * 60 * 1000, // 1 hour for impersonation
      path: '/',
      // Don't set domain - let browser handle cross-origin cookies
    };
    
    res.cookie('accessToken', result.accessToken, cookieOptions);
    res.cookie('refreshToken', result.refreshToken, cookieOptions);
    
    // Return tenant slug and user data for frontend redirect
    return res.json({
      tenantSlug: result.tenant.slug,
      user: result.user,
      tenant: result.tenant,
    });
  }

  // Generic routes come after specific routes
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.superAdminTenantsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.superAdminTenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.superAdminTenantsService.remove(id);
  }
}

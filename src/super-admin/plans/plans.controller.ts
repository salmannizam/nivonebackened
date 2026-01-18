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
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { SuperAdminAuthGuard } from '../../common/guards/super-admin-auth.guard';

@Controller('admin/plans')
@UseGuards(SuperAdminAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Body() createPlanDto: CreatePlanDto) {
    return this.plansService.create(createPlanDto);
  }

  @Get()
  findAll(@Query('activeOnly') activeOnly?: string) {
    return this.plansService.findAll(activeOnly === 'true');
  }

  @Get('stats')
  getStats() {
    return this.plansService.getPlanStats();
  }

  @Get('due')
  getDueSubscriptions(@Query('days') days?: string) {
    const upcomingDays = days ? parseInt(days, 10) : 7;
    return this.plansService.getSubscriptionsDue(upcomingDays);
  }

  @Get('subscriptions/all')
  getAllSubscriptions(@Query('status') status?: string) {
    return this.plansService.getAllSubscriptions(status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePlanDto: UpdatePlanDto) {
    return this.plansService.update(id, updatePlanDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.plansService.remove(id);
  }

  @Post('tenants/:tenantId/assign')
  assignPlan(@Param('tenantId') tenantId: string, @Body() assignPlanDto: AssignPlanDto) {
    return this.plansService.assignPlanToTenant(tenantId, assignPlanDto);
  }

  @Get('tenants/:tenantId/subscription')
  getTenantSubscription(@Param('tenantId') tenantId: string) {
    return this.plansService.getTenantSubscription(tenantId);
  }

  @Post('tenants/:tenantId/mark-paid')
  markPaid(@Param('tenantId') tenantId: string, @Body() body: { amount: number }) {
    return this.plansService.markSubscriptionPaid(tenantId, body.amount);
  }

  @Get('default/check')
  async checkDefaultPlan() {
    const hasDefault = await this.plansService.hasDefaultPlan();
    return { hasDefault };
  }

  @Post(':id/set-default')
  setDefaultPlan(@Param('id') id: string) {
    return this.plansService.setDefaultPlan(id);
  }
}

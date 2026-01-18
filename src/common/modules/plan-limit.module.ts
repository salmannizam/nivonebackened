import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlanLimitService } from '../services/plan-limit.service';
import { Tenant, TenantSchema } from '../../tenants/schemas/tenant.schema';
import { PlanSubscription, PlanSubscriptionSchema } from '../schemas/plan-subscription.schema';
import { Plan, PlanSchema } from '../schemas/plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tenant.name, schema: TenantSchema },
      { name: PlanSubscription.name, schema: PlanSubscriptionSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
  ],
  providers: [PlanLimitService],
  exports: [PlanLimitService],
})
export class PlanLimitModule {}

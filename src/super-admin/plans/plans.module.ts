import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Plan, PlanSchema } from '../../common/schemas/plan.schema';
import { PlanSubscription, PlanSubscriptionSchema } from '../../common/schemas/plan-subscription.schema';
import { TenantsModule } from '../../tenants/tenants.module';
import { FeatureFlagModule } from '../../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Plan.name, schema: PlanSchema },
      { name: PlanSubscription.name, schema: PlanSubscriptionSchema },
    ]),
    TenantsModule,
    FeatureFlagModule,
  ],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService],
})
export class PlansModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';
import { Staff, StaffSchema } from './schemas/staff.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { PlanLimitModule } from '../common/modules/plan-limit.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Staff.name, schema: StaffSchema }]),
    FeatureFlagModule,
    PlanLimitModule,
  ],
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}

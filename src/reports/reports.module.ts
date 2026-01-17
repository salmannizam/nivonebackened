import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ResidentsModule } from '../residents/residents.module';
import { PaymentsModule } from '../payments/payments.module';
import { RoomsModule } from '../rooms/rooms.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { VisitorsModule } from '../visitors/visitors.module';
import { BedsModule } from '../beds/beds.module';
import { StaffModule } from '../staff/staff.module';
import { AssetsModule } from '../assets/assets.module';
import { GatePassesModule } from '../gate-passes/gate-passes.module';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    ResidentsModule,
    PaymentsModule,
    RoomsModule,
    ComplaintsModule,
    VisitorsModule,
    BedsModule,
    StaffModule,
    AssetsModule,
    GatePassesModule,
    FeatureFlagModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

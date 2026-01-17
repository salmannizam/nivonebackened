import { Module } from '@nestjs/common';
import { ExportService } from './export.service';
import { ExportController } from './export.controller';
import { ResidentsModule } from '../residents/residents.module';
import { PaymentsModule } from '../payments/payments.module';
import { BedsModule } from '../beds/beds.module';
import { RoomsModule } from '../rooms/rooms.module';
import { StaffModule } from '../staff/staff.module';
import { AssetsModule } from '../assets/assets.module';
import { GatePassesModule } from '../gate-passes/gate-passes.module';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    ResidentsModule,
    PaymentsModule,
    BedsModule,
    RoomsModule,
    StaffModule,
    AssetsModule,
    GatePassesModule,
    FeatureFlagModule,
  ],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}

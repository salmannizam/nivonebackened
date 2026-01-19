import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResidentPortalController } from './resident-portal.controller';
import { ResidentPortalService } from './resident-portal.service';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { ResidentsModule } from '../residents/residents.module';
import { PaymentsModule } from '../payments/payments.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { NoticesModule } from '../notices/notices.module';
import { GatePassesModule } from '../gate-passes/gate-passes.module';
import { VisitorsModule } from '../visitors/visitors.module';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resident.name, schema: ResidentSchema }]),
    ResidentsModule,
    forwardRef(() => PaymentsModule),
    ComplaintsModule,
    NoticesModule,
    GatePassesModule,
    VisitorsModule,
    FeatureFlagModule,
  ],
  controllers: [ResidentPortalController],
  providers: [ResidentPortalService],
})
export class ResidentPortalModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { RentPayment, RentPaymentSchema } from '../payments/schemas/rent-payment.schema';
import { Bed, BedSchema } from '../beds/schemas/bed.schema';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { Complaint, ComplaintSchema } from '../complaints/schemas/complaint.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RentPayment.name, schema: RentPaymentSchema },
      { name: Bed.name, schema: BedSchema },
      { name: Resident.name, schema: ResidentSchema },
      { name: Complaint.name, schema: ComplaintSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
  exports: [InsightsService],
})
export class InsightsModule {}

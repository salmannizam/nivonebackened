import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';
import { Resident, ResidentSchema } from './schemas/resident.schema';
import { RoomsModule } from '../rooms/rooms.module';
import { BedsModule } from '../beds/beds.module';
import { PaymentsModule } from '../payments/payments.module';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Resident.name, schema: ResidentSchema }]),
    RoomsModule,
    BedsModule,
    forwardRef(() => PaymentsModule), // Use forwardRef to avoid circular dependency
    FeatureFlagModule,
  ],
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class ResidentsModule {}

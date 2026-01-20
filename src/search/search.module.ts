import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resident.name, schema: ResidentSchema },
      { name: Room.name, schema: RoomSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}

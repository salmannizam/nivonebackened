import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BedsService } from './beds.service';
import { BedsController } from './beds.controller';
import { Bed, BedSchema } from './schemas/bed.schema';
import { Room, RoomSchema } from '../rooms/schemas/room.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';
import { PlanLimitModule } from '../common/modules/plan-limit.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Bed.name, schema: BedSchema },
      { name: Room.name, schema: RoomSchema },
    ]),
    FeatureFlagModule,
    PlanLimitModule,
  ],
  controllers: [BedsController],
  providers: [BedsService],
  exports: [BedsService],
})
export class BedsModule {}

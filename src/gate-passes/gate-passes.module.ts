import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GatePassesService } from './gate-passes.service';
import { GatePassesController } from './gate-passes.controller';
import { GatePass, GatePassSchema } from './schemas/gate-pass.schema';
import { Resident, ResidentSchema } from '../residents/schemas/resident.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GatePass.name, schema: GatePassSchema },
      { name: Resident.name, schema: ResidentSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [GatePassesController],
  providers: [GatePassesService],
  exports: [GatePassesService],
})
export class GatePassesModule {}

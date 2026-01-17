import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { Building, BuildingSchema } from './schemas/building.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Building.name, schema: BuildingSchema }]),
    FeatureFlagModule,
  ],
  controllers: [BuildingsController],
  providers: [BuildingsService],
  exports: [BuildingsService],
})
export class BuildingsModule {}

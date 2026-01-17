import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLog, ActivityLogSchema } from '../schemas/activity-log.schema';
import { ActivityLogService } from '../services/activity-log.service';
import { ActivityLogController } from '../controllers/activity-log.controller';
import { FeatureFlagModule } from './feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}

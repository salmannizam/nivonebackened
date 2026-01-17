import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NoticesController } from './notices.controller';
import { NoticesService } from './notices.service';
import { NoticeSchedulerService } from './notice-scheduler.service';
import { Notice, NoticeSchema } from './schemas/notice.schema';
import { FeatureFlagModule } from '../common/modules/feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notice.name, schema: NoticeSchema }]),
    FeatureFlagModule,
  ],
  controllers: [NoticesController],
  providers: [NoticesService, NoticeSchedulerService],
  exports: [NoticesService],
})
export class NoticesModule {}

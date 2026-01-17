import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notice, NoticeDocument } from './schemas/notice.schema';

@Injectable()
export class NoticeSchedulerService {
  private readonly logger = new Logger(NoticeSchedulerService.name);

  constructor(
    @InjectModel(Notice.name)
    private noticeModel: Model<NoticeDocument>,
  ) {}

  /**
   * Run hourly to check for notices that need to be published or expired
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleNoticeScheduling() {
    this.logger.log('Starting notice scheduling check...');

    try {
      const now = new Date();

      // Auto-publish notices with scheduleStartDate <= now and status = DRAFT
      const published = await this.noticeModel.updateMany(
        {
          status: 'DRAFT',
          scheduleStartDate: { $lte: now },
        },
        {
          $set: {
            status: 'PUBLISHED',
            publishDate: now,
          },
        },
      );

      if (published.modifiedCount > 0) {
        this.logger.log(`Auto-published ${published.modifiedCount} notices`);
      }

      // Auto-expire notices with expiryDate <= now and status = PUBLISHED
      const expired = await this.noticeModel.updateMany(
        {
          status: 'PUBLISHED',
          expiryDate: { $lte: now },
        },
        {
          $set: {
            status: 'EXPIRED',
          },
        },
      );

      if (expired.modifiedCount > 0) {
        this.logger.log(`Auto-expired ${expired.modifiedCount} notices`);
      }

      this.logger.log('Notice scheduling check completed');
    } catch (error) {
      this.logger.error('Error in notice scheduling:', error);
    }
  }
}

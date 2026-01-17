import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLog, AuditLogSchema } from '../schemas/audit-log.schema';
import { AuditLogService } from '../services/audit-log.service';
import { AuditLogController } from '../controllers/audit-log.controller';
import { FeatureFlagModule } from './feature-flag.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
    ]),
    FeatureFlagModule,
  ],
  controllers: [AuditLogController],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}

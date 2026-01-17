import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FeatureFlag, FeatureFlagSchema } from '../schemas/feature-flag.schema';
import { UserFeaturePermission, UserFeaturePermissionSchema } from '../schemas/user-feature-permission.schema';
import { FeatureFlagService } from '../services/feature-flag.service';
import { FeatureFlagController } from '../controllers/feature-flag.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FeatureFlag.name, schema: FeatureFlagSchema },
      { name: UserFeaturePermission.name, schema: UserFeaturePermissionSchema },
    ]),
  ],
  providers: [FeatureFlagService],
  controllers: [FeatureFlagController],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}

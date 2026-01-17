import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { FeatureKey } from './feature-flag.schema';

export type UserFeaturePermissionDocument = UserFeaturePermission & Document;

@Schema({ timestamps: true })
export class UserFeaturePermission {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: String, enum: Object.values(FeatureKey) })
  featureKey: FeatureKey;

  @Prop({ required: true, default: true })
  enabled: boolean;

  @Prop({ type: [String], default: [] })
  allowedActions?: string[]; // e.g., ['view', 'create', 'update', 'delete']

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserFeaturePermissionSchema = SchemaFactory.createForClass(UserFeaturePermission);

// Compound index for user + feature lookup
UserFeaturePermissionSchema.index({ userId: 1, featureKey: 1 }, { unique: true });
// Tenant + user queries
UserFeaturePermissionSchema.index({ tenantId: 1, userId: 1 });
UserFeaturePermissionSchema.index({ tenantId: 1, userId: 1, enabled: 1 });

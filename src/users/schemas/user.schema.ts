import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { UserRole } from '../../common/decorators/roles.decorator';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop()
  phone?: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
    enum: ['OWNER', 'MANAGER', 'STAFF'],
    default: 'STAFF',
  })
  role: UserRole;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop({ type: [{
    timestamp: Date,
    ipAddress: String,
    userAgent: String,
    device: String,
  }], default: [] })
  loginHistory?: Array<{
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
    device?: string;
  }>;

  @Prop({ type: String, enum: ['en', 'hi'], default: 'en' })
  preferredLanguage?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Compound index for tenant isolation
UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
// Role-based queries
UserSchema.index({ tenantId: 1, role: 1 });
UserSchema.index({ tenantId: 1, isActive: 1 });
UserSchema.index({ tenantId: 1, isActive: 1, role: 1 });
// Email lookup (for login)
UserSchema.index({ email: 1 });
// Phone lookup (if used)
UserSchema.index({ tenantId: 1, phone: 1 });
// Login history queries
UserSchema.index({ tenantId: 1, 'loginHistory.timestamp': -1 });
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SuperAdminDocument = SuperAdmin & Document;

@Schema({ timestamps: true })
export class SuperAdmin {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);
// Email lookup (for login - unique already enforced by @Prop)
SuperAdminSchema.index({ email: 1 }, { unique: true });
// Active super admin queries
SuperAdminSchema.index({ isActive: 1 });
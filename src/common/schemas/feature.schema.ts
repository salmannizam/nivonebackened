import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { FeatureKey } from './feature-flag.schema';

export type FeatureDocument = Feature & Document;

export enum FeatureCategory {
  CORE = 'core',
  PAYMENTS = 'payments',
  OPERATIONS = 'operations',
  MANAGEMENT = 'management',
  ANALYTICS = 'analytics',
  ADVANCED = 'advanced',
}

@Schema({ timestamps: true })
export class Feature {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true, type: String, enum: Object.values(FeatureKey) })
  key: FeatureKey;

  @Prop({ required: true, type: String, enum: Object.values(FeatureCategory) })
  category: FeatureCategory;

  @Prop({ required: true })
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const FeatureSchema = SchemaFactory.createForClass(Feature);

// Indexes
FeatureSchema.index({ key: 1 }, { unique: true });
FeatureSchema.index({ category: 1 });
FeatureSchema.index({ isActive: 1 });

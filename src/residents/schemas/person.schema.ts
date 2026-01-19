import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PersonDocument = Person & Document;

/**
 * Global identity entity representing a person across multiple tenants
 * This allows one person to stay in multiple PGs over time
 */
@Schema({ timestamps: true })
export class Person {
  @Prop({ required: true, unique: true })
  mobile: string; // Globally unique mobile number

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string; // Optional email

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PersonSchema = SchemaFactory.createForClass(Person);

// Mobile lookup index
PersonSchema.index({ mobile: 1 }, { unique: true });
// Name search index
PersonSchema.index({ name: 1 });

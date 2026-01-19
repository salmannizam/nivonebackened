import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OtpDocument = Otp & Document;

@Schema({ timestamps: true })
export class Otp {
  @Prop({ required: true })
  mobile: string;

  @Prop({ required: true })
  otp: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  verified: boolean;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

// Index for OTP lookup
OtpSchema.index({ mobile: 1, otp: 1, verified: 1, expiresAt: 1 });
// Cleanup index for expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

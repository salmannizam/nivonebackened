import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SecurityDepositDocument = SecurityDeposit & Document;

/**
 * Security Deposit Schema
 * One-time record per resident
 * Tracks deposit received and refund status
 */
@Schema({ timestamps: true })
export class SecurityDeposit {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resident', unique: true })
  residentId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: false })
  received: boolean;

  @Prop()
  receivedDate?: Date;

  @Prop()
  paymentMode?: string; // Cash, UPI, Bank Transfer

  @Prop({
    default: 'HELD',
    enum: ['HELD', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  })
  status: string; // HELD | PARTIALLY_REFUNDED | REFUNDED

  @Prop({ default: false })
  refunded: boolean; // Keep for backward compatibility

  @Prop()
  refundDate?: Date;

  @Prop()
  refundAmount?: number; // May be less than amount if deductions apply

  @Prop()
  deductionAmount?: number; // Deductions for damages, etc.

  @Prop()
  deductionReason?: string;

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[]; // Custom tags for security deposits

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const SecurityDepositSchema = SchemaFactory.createForClass(SecurityDeposit);
// Unique constraint (one deposit per resident)
SecurityDepositSchema.index({ tenantId: 1, residentId: 1 }, { unique: true });
// Status filtering
SecurityDepositSchema.index({ tenantId: 1, received: 1 });
SecurityDepositSchema.index({ tenantId: 1, refunded: 1 });
// Compound indexes for common queries
SecurityDepositSchema.index({ tenantId: 1, received: 1, refunded: 1 });
// Date queries
SecurityDepositSchema.index({ tenantId: 1, receivedDate: 1 });
SecurityDepositSchema.index({ tenantId: 1, refundDate: 1 });
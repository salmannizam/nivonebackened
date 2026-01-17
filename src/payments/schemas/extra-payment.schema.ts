import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExtraPaymentDocument = ExtraPayment & Document;

/**
 * Extra Payment Schema
 * Manual payments for electricity, fines, guest charges, etc.
 * Separate from rent payments
 */
@Schema({ timestamps: true })
export class ExtraPayment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resident' })
  residentId: Types.ObjectId;

  @Prop({ required: true })
  description: string; // e.g., "Electricity charges", "Damage fine"

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  date: Date; // Payment date

  @Prop({ required: true })
  paymentMode: string; // Cash, UPI, Bank Transfer

  @Prop()
  notes?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[]; // Custom tags for payments

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ExtraPaymentSchema = SchemaFactory.createForClass(ExtraPayment);
// Multi-tenant isolation indexes
ExtraPaymentSchema.index({ tenantId: 1, residentId: 1 });
ExtraPaymentSchema.index({ tenantId: 1, date: 1 });
// Date range queries
ExtraPaymentSchema.index({ tenantId: 1, date: -1 }); // Descending for recent first
// Resident payment history
ExtraPaymentSchema.index({ tenantId: 1, residentId: 1, date: -1 });
// Amount range queries (for filtering)
ExtraPaymentSchema.index({ tenantId: 1, amount: 1 });
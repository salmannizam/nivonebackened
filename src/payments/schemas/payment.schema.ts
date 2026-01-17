import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resident' })
  residentId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  amountDue: number; // Total amount due for the period

  @Prop({ default: 0 })
  amountPaid: number; // Amount paid so far

  @Prop()
  month?: string; // Format: "YYYY-MM" for monthly fee tracking

  @Prop({ required: true })
  paymentType: string; // rent, deposit, maintenance, fine, etc.

  @Prop({ required: true })
  paymentMethod: string; // cash, cheque, bank_transfer (no online payment gateway)

  @Prop()
  paymentDate: Date;

  @Prop()
  dueDate?: Date;

  @Prop({
    default: 'pending',
    enum: ['PAID', 'PARTIAL', 'DUE', 'OVERDUE', 'pending', 'completed', 'failed', 'refunded'],
  })
  status: string;

  @Prop()
  transactionId?: string;

  @Prop()
  notes?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
// Multi-tenant isolation indexes
PaymentSchema.index({ tenantId: 1, residentId: 1 });
PaymentSchema.index({ tenantId: 1, paymentDate: 1 });
// Status filtering
PaymentSchema.index({ tenantId: 1, status: 1 });
PaymentSchema.index({ tenantId: 1, paymentDate: -1 }); // Descending for recent first
// Payment type queries
PaymentSchema.index({ tenantId: 1, paymentType: 1 });
PaymentSchema.index({ tenantId: 1, paymentType: 1, paymentDate: -1 });
// Resident payment history
PaymentSchema.index({ tenantId: 1, residentId: 1, paymentDate: -1 });
// Month-based queries
PaymentSchema.index({ tenantId: 1, month: 1 });
PaymentSchema.index({ tenantId: 1, month: 1, status: 1 });
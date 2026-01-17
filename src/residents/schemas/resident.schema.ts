import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResidentDocument = Resident & Document;

@Schema({ timestamps: true })
export class Resident {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Room' })
  roomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Bed' })
  bedId?: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop()
  email?: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  alternatePhone?: string;

  @Prop({
    type: {
      name: String,
      phone: String,
      relation: String,
    },
  })
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };

  @Prop()
  address?: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop({
    type: {
      type: String,
      number: String,
      documentUrl: String,
    },
  })
  idProof?: {
    type: string; // Aadhar, PAN, Driving License, etc.
    number: string;
    documentUrl?: string;
  };

  @Prop({ required: true })
  checkInDate: Date;

  @Prop()
  checkOutDate?: Date;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'NOTICE_GIVEN', 'VACATED', 'SUSPENDED'] })
  status: string;

  @Prop()
  moveOutDate?: Date; // Date when resident vacated

  @Prop()
  moveOutReason?: string; // Reason for leaving

  @Prop({ default: false })
  settlementCompleted?: boolean; // Whether final settlement is done

  // Note: monthlyRent removed - rent is now sourced from Bed.rent only
  // This ensures bed rent is the single source of truth for billing

  @Prop()
  deposit?: number;

  @Prop()
  paymentDueDay?: number; // Day of month when rent is due (1-31)

  @Prop()
  depositReceived?: boolean;

  @Prop()
  depositReceivedDate?: Date;

  @Prop()
  notes?: string;

  @Prop()
  expectedVacateDate?: Date; // Expected date when resident will vacate

  @Prop({ type: [String], default: [] })
  tags?: string[]; // Custom tags like "Late payer", "VIP", "Issue-prone"

  @Prop({ default: false })
  archived?: boolean; // Soft delete - archived records are hidden by default

  @Prop()
  archivedAt?: Date; // When the record was archived

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ResidentSchema = SchemaFactory.createForClass(Resident);
// Multi-tenant isolation indexes
ResidentSchema.index({ tenantId: 1, roomId: 1 });
ResidentSchema.index({ tenantId: 1, phone: 1 });
// Bed-based queries (bed is source of truth for rent)
ResidentSchema.index({ tenantId: 1, bedId: 1 });
ResidentSchema.index({ bedId: 1, status: 1 });
// Status filtering (common query pattern)
ResidentSchema.index({ tenantId: 1, status: 1 });
// Date range queries
ResidentSchema.index({ tenantId: 1, checkInDate: 1 });
ResidentSchema.index({ tenantId: 1, moveOutDate: 1 });
// Settlement queries
ResidentSchema.index({ tenantId: 1, status: 1, settlementCompleted: 1 });
// Compound index for active residents with beds (rent payment generation)
ResidentSchema.index({ tenantId: 1, status: 1, bedId: 1 });
// Archived records (soft delete)
ResidentSchema.index({ tenantId: 1, archived: 1 });
ResidentSchema.index({ tenantId: 1, archived: 1, status: 1 });
// Tags filtering
ResidentSchema.index({ tenantId: 1, tags: 1 });
// Expected vacate date queries
ResidentSchema.index({ tenantId: 1, expectedVacateDate: 1 });
ResidentSchema.index({ tenantId: 1, status: 1, expectedVacateDate: 1 });
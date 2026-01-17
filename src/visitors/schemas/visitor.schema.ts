import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VisitorDocument = Visitor & Document;

@Schema({ timestamps: true })
export class Visitor {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resident' })
  residentId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  phone: string;

  @Prop()
  email?: string;

  @Prop({
    type: {
      type: String,
      number: String,
    },
  })
  idProof?: {
    type: string;
    number: string;
  };

  @Prop({ required: true })
  visitDate: Date;

  @Prop()
  checkInTime?: Date;

  @Prop()
  checkOutTime?: Date;

  @Prop()
  purpose?: string;

  @Prop()
  notes?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const VisitorSchema = SchemaFactory.createForClass(Visitor);
// Multi-tenant isolation indexes
VisitorSchema.index({ tenantId: 1, visitDate: 1 });
VisitorSchema.index({ tenantId: 1, residentId: 1 });
// Date range queries (for today's visitors, date range filters)
VisitorSchema.index({ tenantId: 1, visitDate: -1 }); // Descending for recent first
// Resident visitor history
VisitorSchema.index({ tenantId: 1, residentId: 1, visitDate: -1 });
// Check-in/check-out queries
VisitorSchema.index({ tenantId: 1, checkInTime: 1 });
VisitorSchema.index({ tenantId: 1, checkOutTime: 1 });
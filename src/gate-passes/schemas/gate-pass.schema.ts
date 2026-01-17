import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GatePassDocument = GatePass & Document;

@Schema({ timestamps: true })
export class GatePass {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Resident' })
  residentId: Types.ObjectId;

  @Prop({ required: true })
  exitTime: Date;

  @Prop()
  expectedReturnTime?: Date;

  @Prop()
  actualReturnTime?: Date;

  @Prop()
  purpose?: string; // Going home, Medical, Shopping, etc.

  @Prop()
  destination?: string;

  @Prop()
  contactPerson?: string;

  @Prop()
  contactPhone?: string;

  @Prop({
    default: 'OUT',
    enum: ['OUT', 'RETURNED', 'OVERDUE'],
  })
  status: string;

  @Prop()
  notes?: string;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const GatePassSchema = SchemaFactory.createForClass(GatePass);
// Multi-tenant isolation indexes
GatePassSchema.index({ tenantId: 1, residentId: 1 });
GatePassSchema.index({ tenantId: 1, exitTime: 1 });
GatePassSchema.index({ tenantId: 1, status: 1 });
// Overdue gate passes queries (common dashboard query)
GatePassSchema.index({ tenantId: 1, status: 1, expectedReturnTime: 1 });
GatePassSchema.index({ tenantId: 1, expectedReturnTime: 1, status: 1 });
// Resident gate pass history
GatePassSchema.index({ tenantId: 1, residentId: 1, exitTime: -1 });
// Active passes (for dashboard)
GatePassSchema.index({ tenantId: 1, status: 1, exitTime: -1 });
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PersonalNoteDocument = PersonalNote & Document;

@Schema({ timestamps: true })
export class PersonalNote {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  userId: Types.ObjectId; // Owner of the note

  @Prop({ required: true, type: Types.ObjectId, ref: 'Tenant' })
  tenantId: Types.ObjectId; // Stored for safety/tenant isolation

  @Prop({ required: true })
  content: string; // Note content

  @Prop({ default: false })
  isPinned: boolean; // Whether note is pinned

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const PersonalNoteSchema = SchemaFactory.createForClass(PersonalNote);

// Indexes for efficient queries
PersonalNoteSchema.index({ userId: 1, isPinned: -1, createdAt: -1 }); // For user's notes sorted by pinned first, then date
PersonalNoteSchema.index({ userId: 1, tenantId: 1 }); // For user + tenant queries
PersonalNoteSchema.index({ userId: 1, isPinned: 1 }); // For counting pinned notes

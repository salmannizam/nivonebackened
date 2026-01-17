import { PartialType } from '@nestjs/mapped-types';
import { CreateComplaintDto } from './create-complaint.dto';

export class UpdateComplaintDto extends PartialType(CreateComplaintDto) {
  status?: string;
  assignedTo?: string;
  resolution?: string;
  resolvedAt?: Date;
  notes?: string;
}

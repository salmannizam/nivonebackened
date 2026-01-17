import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Complaint, ComplaintDocument } from './schemas/complaint.schema';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectModel(Complaint.name) private complaintModel: Model<ComplaintDocument>,
  ) {}

  async create(createComplaintDto: CreateComplaintDto, tenantId: string) {
    const complaint = new this.complaintModel({
      ...createComplaintDto,
      tenantId,
    });
    return complaint.save();
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      priority?: string;
      residentId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.residentId) {
      query.residentId = filters.residentId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }
    
    let complaints = await this.complaintModel
      .find(query)
      .populate('residentId')
      .populate('assignedTo')
      .exec();
    
    // Apply search filter (title, description)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      complaints = complaints.filter((c: any) => {
        const complaintObj = c.toObject ? c.toObject() : c;
        return (
          complaintObj.title?.toLowerCase().includes(searchLower) ||
          complaintObj.description?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return complaints;
  }

  async findOne(id: string, tenantId: string) {
    const complaint = await this.complaintModel
      .findOne({ _id: id, tenantId })
      .populate('residentId')
      .populate('assignedTo')
      .exec();
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    return complaint;
  }

  async update(id: string, updateComplaintDto: UpdateComplaintDto, tenantId: string) {
    if (updateComplaintDto.status === 'resolved' && !updateComplaintDto.resolvedAt) {
      updateComplaintDto.resolvedAt = new Date();
    }
    const complaint = await this.complaintModel
      .findOneAndUpdate({ _id: id, tenantId }, updateComplaintDto, { new: true })
      .exec();
    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }
    return complaint;
  }

  async remove(id: string, tenantId: string) {
    const result = await this.complaintModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Complaint not found');
    }
  }
}

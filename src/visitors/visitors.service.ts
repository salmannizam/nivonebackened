import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Visitor, VisitorDocument } from './schemas/visitor.schema';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { UpdateVisitorDto } from './dto/update-visitor.dto';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectModel(Visitor.name) private visitorModel: Model<VisitorDocument>,
  ) {}

  async create(createVisitorDto: CreateVisitorDto, tenantId: string): Promise<any> {
    const visitor = new this.visitorModel({
      ...createVisitorDto,
      tenantId,
      checkInTime: createVisitorDto.checkInTime || new Date(),
    });
    const savedVisitor = await visitor.save();
    
    // Populate and transform response
    const populated = await this.visitorModel
      .findById(savedVisitor._id)
      .populate('residentId')
      .exec();
    
    if (!populated) {
      return savedVisitor;
    }

    const visitorObj = populated.toObject ? populated.toObject() : populated;
    const resident = visitorObj.residentId as any;
    return {
      ...visitorObj,
      residentName: resident?.name || null,
      residentId: resident?._id || visitorObj.residentId,
    };
  }

  async findAll(
    tenantId: string,
    filters?: {
      residentId?: string;
      date?: Date;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
      status?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.residentId) {
      query.residentId = filters.residentId;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters?.dateFrom || filters?.dateTo) {
      query.visitDate = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        query.visitDate.$gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        query.visitDate.$lte = to;
      }
    }
    
    let visitors = await this.visitorModel.find(query).populate('residentId').exec();
    
    // Apply search filter (name, phone, purpose)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      visitors = visitors.filter((v: any) => {
        const visitorObj = v.toObject ? v.toObject() : v;
        return (
          visitorObj.name?.toLowerCase().includes(searchLower) ||
          visitorObj.phone?.includes(filters.search) ||
          visitorObj.purpose?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Transform to include residentName
    return visitors.map((visitor: any) => {
      const visitorObj = visitor.toObject ? visitor.toObject() : visitor;
      const resident = visitorObj.residentId as any;
      return {
        ...visitorObj,
        residentName: resident?.name || null,
        residentId: resident?._id || visitorObj.residentId,
      };
    });
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const visitor = await this.visitorModel
      .findOne({ _id: id, tenantId })
      .populate('residentId')
      .exec();
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }
    const visitorObj = visitor.toObject ? visitor.toObject() : visitor;
    const resident = visitorObj.residentId as any;
    return {
      ...visitorObj,
      residentName: resident?.name || null,
      residentId: resident?._id || visitorObj.residentId,
    };
  }

  async update(id: string, updateVisitorDto: UpdateVisitorDto, tenantId: string): Promise<any> {
    const visitor = await this.visitorModel
      .findOneAndUpdate({ _id: id, tenantId }, updateVisitorDto, { new: true })
      .populate('residentId')
      .exec();
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }
    const visitorObj = visitor.toObject ? visitor.toObject() : visitor;
    const resident = visitorObj.residentId as any;
    return {
      ...visitorObj,
      residentName: resident?.name || null,
      residentId: resident?._id || visitorObj.residentId,
    };
  }

  async remove(id: string, tenantId: string) {
    const result = await this.visitorModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Visitor not found');
    }
  }

  async checkOut(id: string, tenantId: string): Promise<any> {
    const visitor = await this.visitorModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        { checkOutTime: new Date() },
        { new: true },
      )
      .populate('residentId')
      .exec();
    
    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }
    
    const visitorObj = visitor.toObject ? visitor.toObject() : visitor;
    const resident = visitorObj.residentId as any;
    return {
      ...visitorObj,
      residentName: resident?.name || null,
      residentId: resident?._id || visitorObj.residentId,
    };
  }
}

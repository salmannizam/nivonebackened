import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notice, NoticeDocument } from './schemas/notice.schema';
import { CreateNoticeDto } from './dto/create-notice.dto';
import { UpdateNoticeDto } from './dto/update-notice.dto';

@Injectable()
export class NoticesService {
  constructor(
    @InjectModel(Notice.name) private noticeModel: Model<NoticeDocument>,
  ) {}

  async create(createNoticeDto: CreateNoticeDto, tenantId: string): Promise<any> {
    // Map frontend fields to schema fields
    const noticeData: any = {
      title: createNoticeDto.title,
      content: createNoticeDto.content,
      category: createNoticeDto.category,
      priority: createNoticeDto.priority,
      tenantId,
      // Map startDate/endDate to publishDate/expiryDate
      publishDate: createNoticeDto.startDate 
        ? new Date(createNoticeDto.startDate) 
        : createNoticeDto.publishDate || new Date(),
      expiryDate: createNoticeDto.endDate 
        ? new Date(createNoticeDto.endDate) 
        : createNoticeDto.expiryDate,
      targetResidents: createNoticeDto.targetResidents,
      // Map isActive to status
      status: createNoticeDto.isActive === false ? 'inactive' : 'active',
    };
    
    const notice = new this.noticeModel(noticeData);
    const saved = await notice.save();
    
    // Transform response to include frontend-friendly fields
    const noticeObj = saved.toObject ? saved.toObject() : saved;
    return {
      ...noticeObj,
      startDate: noticeObj.publishDate,
      endDate: noticeObj.expiryDate,
      isActive: noticeObj.status === 'active',
    };
  }

  async findAll(
    tenantId: string,
    filters?: {
      status?: string;
      category?: string;
      priority?: string;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.priority) {
      query.priority = filters.priority;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.publishDate = {};
      if (filters.dateFrom) {
        query.publishDate.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.publishDate.$lte = filters.dateTo;
      }
    }
    
    let notices = await this.noticeModel
      .find(query)
      .sort({ publishDate: -1 })
      .populate('targetResidents')
      .exec();
    
    // Apply search filter (title, content)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      notices = notices.filter((n: any) => {
        const noticeObj = n.toObject ? n.toObject() : n;
        return (
          noticeObj.title?.toLowerCase().includes(searchLower) ||
          noticeObj.content?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Transform to include frontend-friendly fields
    return notices.map((notice: any) => {
      const noticeObj = notice.toObject ? notice.toObject() : notice;
      return {
        ...noticeObj,
        startDate: noticeObj.publishDate,
        endDate: noticeObj.expiryDate,
        isActive: noticeObj.status === 'active',
      };
    });
  }

  async findActive(tenantId: string) {
    const now = new Date();
    const notices = await this.noticeModel
      .find({
        tenantId,
        status: 'active',
        $and: [
          {
            $or: [
              { publishDate: { $lte: now } },
              { publishDate: { $exists: false } },
            ],
          },
          {
            $or: [
              { expiryDate: { $gte: now } },
              { expiryDate: { $exists: false } },
            ],
          },
        ],
      })
      .sort({ publishDate: -1 })
      .exec();
    
    // Transform to include frontend-friendly fields
    return notices.map((notice: any) => {
      const noticeObj = notice.toObject ? notice.toObject() : notice;
      return {
        ...noticeObj,
        startDate: noticeObj.publishDate,
        endDate: noticeObj.expiryDate,
        isActive: noticeObj.status === 'active',
      };
    });
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const notice = await this.noticeModel
      .findOne({ _id: id, tenantId })
      .populate('targetResidents')
      .exec();
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    const noticeObj = notice.toObject ? notice.toObject() : notice;
    return {
      ...noticeObj,
      startDate: noticeObj.publishDate,
      endDate: noticeObj.expiryDate,
      isActive: noticeObj.status === 'active',
    };
  }

  async update(id: string, updateNoticeDto: UpdateNoticeDto, tenantId: string): Promise<any> {
    // Map frontend fields to schema fields
    const updateData: any = { ...updateNoticeDto };
    
    if (updateNoticeDto.startDate !== undefined) {
      updateData.publishDate = new Date(updateNoticeDto.startDate);
      delete updateData.startDate;
    }
    
    if (updateNoticeDto.endDate !== undefined) {
      updateData.expiryDate = updateNoticeDto.endDate ? new Date(updateNoticeDto.endDate) : null;
      delete updateData.endDate;
    }
    
    if (updateNoticeDto.isActive !== undefined) {
      updateData.status = updateNoticeDto.isActive === false ? 'inactive' : 'active';
      delete updateData.isActive;
    }
    
    const notice = await this.noticeModel
      .findOneAndUpdate({ _id: id, tenantId }, updateData, { new: true })
      .exec();
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    const noticeObj = notice.toObject ? notice.toObject() : notice;
    return {
      ...noticeObj,
      startDate: noticeObj.publishDate,
      endDate: noticeObj.expiryDate,
      isActive: noticeObj.status === 'active',
    };
  }

  async remove(id: string, tenantId: string) {
    const result = await this.noticeModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Notice not found');
    }
  }
}

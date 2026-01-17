import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ExtraPayment, ExtraPaymentDocument } from './schemas/extra-payment.schema';

@Injectable()
export class ExtraPaymentService {
  constructor(
    @InjectModel(ExtraPayment.name)
    private extraPaymentModel: Model<ExtraPaymentDocument>,
  ) {}

  /**
   * Create extra payment (manual)
   */
  async create(createData: {
    tenantId: string;
    residentId: string;
    description: string;
    amount: number;
    date: Date;
    paymentMode: string;
    notes?: string;
  }) {
    const tenantObjectId = typeof createData.tenantId === 'string' 
      ? new Types.ObjectId(createData.tenantId) 
      : createData.tenantId;
    const residentObjectId = typeof createData.residentId === 'string' 
      ? new Types.ObjectId(createData.residentId) 
      : createData.residentId;

    const payment = new this.extraPaymentModel({
      ...createData,
      tenantId: tenantObjectId,
      residentId: residentObjectId,
    });
    return payment.save();
  }

  /**
   * Get all extra payments
   */
  async findAll(
    tenantId: string,
    filters?: {
      residentId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      amountMin?: number;
      amountMax?: number;
      search?: string;
    },
  ) {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const query: any = { tenantId: tenantObjectId };
    if (filters?.residentId) {
      query.residentId = typeof filters.residentId === 'string' 
        ? new Types.ObjectId(filters.residentId) 
        : filters.residentId;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.date = {};
      if (filters.dateFrom) {
        query.date.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.date.$lte = filters.dateTo;
      }
    }
    if (filters?.amountMin || filters?.amountMax) {
      query.amount = {};
      if (filters.amountMin) {
        query.amount.$gte = filters.amountMin;
      }
      if (filters.amountMax) {
        query.amount.$lte = filters.amountMax;
      }
    }
    
    let payments = await this.extraPaymentModel
      .find(query)
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .sort({ date: -1 })
      .exec();
    
    // Apply search filter (description, resident name)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      payments = payments.filter((p: any) => {
        const paymentObj = p.toObject ? p.toObject() : p;
        const resident = paymentObj.residentId as any;
        return (
          paymentObj.description?.toLowerCase().includes(searchLower) ||
          resident?.name?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Transform to include roomNumber and bedNumber
    return payments.map((payment: any) => {
      const paymentObj = payment.toObject ? payment.toObject() : payment;
      const resident = paymentObj.residentId as any;
      
      // Get room number from resident's roomId
      let roomNumber = null;
      if (resident?.roomId) {
        roomNumber = resident.roomId.roomNumber || resident.roomId;
      }
      
      // Get bed number from resident's bedId
      let bedNumber = null;
      if (resident?.bedId?.bedNumber) {
        bedNumber = resident.bedId.bedNumber;
      }
      
      return {
        ...paymentObj,
        residentName: resident?.name || null,
        residentPhone: resident?.phone || null,
        roomNumber: roomNumber,
        bedNumber: bedNumber,
        residentId: resident?._id || paymentObj.residentId,
      };
    });
  }

  /**
   * Get extra payment by ID
   */
  async findOne(id: string, tenantId: string) {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const payment = await this.extraPaymentModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .populate('residentId', 'name phone')
      .exec();

    if (!payment) {
      throw new NotFoundException('Extra payment not found');
    }

    return payment;
  }

  /**
   * Update extra payment
   */
  async update(
    id: string,
    tenantId: string,
    updateData: {
      description?: string;
      amount?: number;
      date?: Date;
      paymentMode?: string;
      notes?: string;
    },
  ): Promise<any> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const payment = await this.extraPaymentModel
      .findOneAndUpdate({ _id: id, tenantId: tenantObjectId }, updateData, { new: true })
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    if (!payment) {
      throw new NotFoundException('Extra payment not found');
    }
    
    const paymentObj = payment.toObject ? payment.toObject() : payment;
    const resident = paymentObj.residentId as any;
    
    // Get room number from resident's roomId
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    // Get bed number from resident's bedId
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...paymentObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || paymentObj.residentId,
    };

    if (!payment) {
      throw new NotFoundException('Extra payment not found');
    }

    return payment;
  }

  /**
   * Delete extra payment
   */
  async remove(id: string, tenantId: string) {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const result = await this.extraPaymentModel
      .findOneAndDelete({ _id: id, tenantId: tenantObjectId })
      .exec();

    if (!result) {
      throw new NotFoundException('Extra payment not found');
    }
  }
}

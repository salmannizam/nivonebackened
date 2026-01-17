import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SecurityDeposit, SecurityDepositDocument } from './schemas/security-deposit.schema';

@Injectable()
export class SecurityDepositService {
  constructor(
    @InjectModel(SecurityDeposit.name)
    private securityDepositModel: Model<SecurityDepositDocument>,
  ) {}

  /**
   * Create or update security deposit for a resident
   */
  async createOrUpdate(createData: {
    tenantId: string;
    residentId: string;
    amount: number;
    received?: boolean;
    receivedDate?: Date;
    paymentMode?: string;
  }): Promise<any> {
    const tenantObjectId = typeof createData.tenantId === 'string' 
      ? new Types.ObjectId(createData.tenantId) 
      : createData.tenantId;
    const residentObjectId = typeof createData.residentId === 'string' 
      ? new Types.ObjectId(createData.residentId) 
      : createData.residentId;

    const existing = await this.securityDepositModel.findOne({
      tenantId: tenantObjectId,
      residentId: residentObjectId,
    });

    if (existing) {
      // Update existing deposit
      const updated = await this.securityDepositModel
        .findByIdAndUpdate(
          existing._id,
          {
            amount: createData.amount,
            received: createData.received ?? existing.received,
            receivedDate: createData.receivedDate || existing.receivedDate,
            paymentMode: createData.paymentMode || existing.paymentMode,
          },
          { new: true },
        )
        .populate({
          path: 'residentId',
          select: 'name phone roomId bedId',
          populate: [
            { path: 'roomId', select: 'roomNumber' },
            { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
          ]
        })
        .exec();
      
      if (!updated) return existing;
      
      const depositObj = updated.toObject ? updated.toObject() : updated;
      const resident = depositObj.residentId as any;
      
      let roomNumber = null;
      if (resident?.roomId) {
        roomNumber = resident.roomId.roomNumber || resident.roomId;
      }
      
      let bedNumber = null;
      if (resident?.bedId?.bedNumber) {
        bedNumber = resident.bedId.bedNumber;
      }
      
      return {
        ...depositObj,
        residentName: resident?.name || null,
        residentPhone: resident?.phone || null,
        roomNumber: roomNumber,
        bedNumber: bedNumber,
        residentId: resident?._id || depositObj.residentId,
      };
    }

    // Create new deposit
    const deposit = new this.securityDepositModel({
      ...createData,
      tenantId: tenantObjectId,
      residentId: residentObjectId,
      received: createData.received || false,
      status: createData.received ? 'HELD' : 'HELD', // Default to HELD when created
    });
    const saved = await deposit.save();
    
    // Populate and transform
    const populated = await this.securityDepositModel
      .findById(saved._id)
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    if (!populated) return saved;
    
    const depositObj = populated.toObject ? populated.toObject() : populated;
    const resident = depositObj.residentId as any;
    
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...depositObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || depositObj.residentId,
    };
  }

  /**
   * Get all security deposits
   */
  async findAll(
    tenantId: string,
    filters?: {
      residentId?: string;
      received?: boolean;
      refunded?: boolean;
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
    if (filters?.received !== undefined) {
      query.received = filters.received;
    }
    if (filters?.refunded !== undefined) {
      query.refunded = filters.refunded;
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
    
    let deposits = await this.securityDepositModel
      .find(query)
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    // Apply search filter (resident name)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      deposits = deposits.filter((d: any) => {
        const depositObj = d.toObject ? d.toObject() : d;
        const resident = depositObj.residentId as any;
        return resident?.name?.toLowerCase().includes(searchLower);
      });
    }
    
    // Transform to include roomNumber and bedNumber
    return deposits.map((deposit: any) => {
      const depositObj = deposit.toObject ? deposit.toObject() : deposit;
      const resident = depositObj.residentId as any;
      
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
        ...depositObj,
        residentName: resident?.name || null,
        residentPhone: resident?.phone || null,
        roomNumber: roomNumber,
        bedNumber: bedNumber,
        residentId: resident?._id || depositObj.residentId,
      };
    });
  }

  /**
   * Get security deposit by ID
   */
  async findOne(id: string, tenantId: string): Promise<any> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const deposit = await this.securityDepositModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();

    if (!deposit) {
      throw new NotFoundException('Security deposit not found');
    }

    const depositObj = deposit.toObject ? deposit.toObject() : deposit;
    const resident = depositObj.residentId as any;
    
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...depositObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || depositObj.residentId,
    };
  }

  /**
   * Get security deposit by resident ID
   */
  async findByResident(tenantId: string, residentId: string): Promise<any> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const residentObjectId = typeof residentId === 'string' 
      ? new Types.ObjectId(residentId) 
      : residentId;
    const deposit = await this.securityDepositModel
      .findOne({ tenantId: tenantObjectId, residentId: residentObjectId })
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    if (!deposit) {
      return null;
    }
    
    const depositObj = deposit.toObject ? deposit.toObject() : deposit;
    const resident = depositObj.residentId as any;
    
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...depositObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || depositObj.residentId,
    };
  }

  /**
   * Mark deposit as received
   */
  async markReceived(
    id: string,
    tenantId: string,
    data: { receivedDate?: Date; paymentMode?: string },
  ): Promise<any> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const deposit = await this.securityDepositModel
      .findOneAndUpdate(
        { _id: id, tenantId: tenantObjectId },
        {
          received: true,
          receivedDate: data.receivedDate || new Date(),
          paymentMode: data.paymentMode,
        },
        { new: true },
      )
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    if (!deposit) {
      throw new NotFoundException('Security deposit not found');
    }
    
    const depositObj = deposit.toObject ? deposit.toObject() : deposit;
    const resident = depositObj.residentId as any;
    
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...depositObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || depositObj.residentId,
    };
  }

  /**
   * Process refund
   */
  async processRefund(
    id: string,
    tenantId: string,
    data: {
      refundDate?: Date;
      refundAmount?: number;
      deductionAmount?: number;
      deductionReason?: string;
      notes?: string;
    },
  ): Promise<any> {
    const existingDeposit = await this.findOne(id, tenantId);

    if (!existingDeposit.received) {
      throw new BadRequestException('Deposit must be received before refund');
    }

    const refundAmount = data.refundAmount ?? existingDeposit.amount - (data.deductionAmount || 0);
    
    // Determine status based on refund amount
    let status = 'REFUNDED';
    if (data.deductionAmount && data.deductionAmount > 0 && refundAmount < existingDeposit.amount) {
      status = 'PARTIALLY_REFUNDED';
    }

    const deposit = await this.securityDepositModel
      .findByIdAndUpdate(
        id,
        {
          refunded: true,
          status: status,
          refundDate: data.refundDate || new Date(),
          refundAmount,
          deductionAmount: data.deductionAmount,
          deductionReason: data.deductionReason,
          notes: data.notes,
        },
        { new: true },
      )
      .populate({
        path: 'residentId',
        select: 'name phone roomId bedId',
        populate: [
          { path: 'roomId', select: 'roomNumber' },
          { path: 'bedId', select: 'bedNumber roomId', populate: { path: 'roomId', select: 'roomNumber' } }
        ]
      })
      .exec();
    
    if (!deposit) {
      throw new NotFoundException('Security deposit not found');
    }
    
    const depositObj = (deposit as any).toObject ? (deposit as any).toObject() : deposit;
    const resident = depositObj.residentId as any;
    
    let roomNumber = null;
    if (resident?.roomId) {
      roomNumber = resident.roomId.roomNumber || resident.roomId;
    }
    
    let bedNumber = null;
    if (resident?.bedId?.bedNumber) {
      bedNumber = resident.bedId.bedNumber;
    }
    
    return {
      ...depositObj,
      residentName: resident?.name || null,
      residentPhone: resident?.phone || null,
      roomNumber: roomNumber,
      bedNumber: bedNumber,
      residentId: resident?._id || depositObj.residentId,
    };
  }

  /**
   * Update deposit
   */
  async update(
    id: string,
    tenantId: string,
    updateData: {
      amount?: number;
      received?: boolean;
      receivedDate?: Date;
      paymentMode?: string;
      notes?: string;
    },
  ): Promise<any> {
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;
    const deposit = await this.securityDepositModel
      .findOneAndUpdate({ _id: id, tenantId: tenantObjectId }, updateData, { new: true })
      .populate('residentId', 'name phone')
      .exec();

    if (!deposit) {
      throw new NotFoundException('Security deposit not found');
    }

    return deposit;
  }
}

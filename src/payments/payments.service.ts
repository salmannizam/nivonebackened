import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, tenantId: string): Promise<any> {
    // Map frontend fields to schema fields
    const amountDue = createPaymentDto.amountDue || createPaymentDto.amount;
    const amountPaid = createPaymentDto.amountPaid || createPaymentDto.amount;
    
    // Determine status based on payment amounts
    let status = createPaymentDto.status || 'pending';
    if (createPaymentDto.month) {
      // Monthly fee payment
      if (amountPaid >= amountDue) {
        status = 'PAID';
      } else if (amountPaid > 0) {
        status = 'PARTIAL';
      } else {
        status = 'DUE';
      }
      
      // Check if overdue
      if (createPaymentDto.dueDate && new Date() > createPaymentDto.dueDate && status !== 'PAID') {
        status = 'OVERDUE';
      }
    }

    const paymentData: any = {
      residentId: createPaymentDto.residentId,
      amount: createPaymentDto.amount,
      amountDue: amountDue,
      amountPaid: amountPaid,
      month: createPaymentDto.month,
      paymentType: createPaymentDto.paymentType,
      paymentMethod: createPaymentDto.paymentMethod,
      paymentDate: createPaymentDto.paymentDate || new Date(),
      dueDate: createPaymentDto.dueDate,
      transactionId: createPaymentDto.transactionId,
      notes: createPaymentDto.description || createPaymentDto.notes, // Map description to notes
      status: status,
      tenantId,
    };
    
    const payment = new this.paymentModel(paymentData);
    const savedPayment = await payment.save();
    
    // Populate and transform response
    const populated = await this.paymentModel
      .findById(savedPayment._id)
      .populate('residentId')
      .exec();
    
    if (!populated) {
      return savedPayment;
    }

    const paymentObj = populated.toObject ? populated.toObject() : populated;
    const resident = paymentObj.residentId as any;
    return {
      ...paymentObj,
      residentName: resident?.name || null,
      residentId: resident?._id || paymentObj.residentId,
    };
  }

  async findAll(tenantId: string, residentId?: string) {
    const query: any = { tenantId };
    if (residentId) {
      query.residentId = residentId;
    }
    const payments = await this.paymentModel.find(query).populate('residentId').exec();
    // Transform to include residentName
    return payments.map((payment: any) => {
      const paymentObj = payment.toObject ? payment.toObject() : payment;
      const resident = paymentObj.residentId as any;
      return {
        ...paymentObj,
        residentName: resident?.name || null,
        residentId: resident?._id || paymentObj.residentId,
      };
    });
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const payment = await this.paymentModel
      .findOne({ _id: id, tenantId })
      .populate('residentId')
      .exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    const paymentObj = payment.toObject ? payment.toObject() : payment;
    const resident = paymentObj.residentId as any;
    return {
      ...paymentObj,
      residentName: resident?.name || null,
      residentId: resident?._id || paymentObj.residentId,
    };
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto, tenantId: string): Promise<any> {
    const payment = await this.paymentModel
      .findOneAndUpdate({ _id: id, tenantId }, updatePaymentDto, { new: true })
      .populate('residentId')
      .exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    const paymentObj = payment.toObject ? payment.toObject() : payment;
    const resident = paymentObj.residentId as any;
    return {
      ...paymentObj,
      residentName: resident?.name || null,
      residentId: resident?._id || paymentObj.residentId,
    };
  }

  async remove(id: string, tenantId: string) {
    const result = await this.paymentModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Payment not found');
    }
  }

  async getSummary(tenantId: string, startDate?: Date, endDate?: Date) {
    const query: any = { tenantId, status: { $in: ['completed', 'PAID'] } };
    if (startDate || endDate) {
      query.paymentDate = {};
      if (startDate) query.paymentDate.$gte = startDate;
      if (endDate) query.paymentDate.$lte = endDate;
    }

    const payments = await this.paymentModel.find(query).exec();
    const total = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      total,
      count: payments.length,
      byType: payments.reduce((acc, p) => {
        acc[p.paymentType] = (acc[p.paymentType] || 0) + p.amount;
        return acc;
      }, {}),
    };
  }

  private transformPaymentResponse(payment: any) {
    const paymentObj = payment.toObject ? payment.toObject() : payment;
    const resident = paymentObj.residentId as any;
    return {
      ...paymentObj,
      residentName: resident?.name || null,
      residentId: resident?._id || paymentObj.residentId,
    };
  }

  async getPendingPayments(tenantId: string) {
    const now = new Date();
    const pending = await this.paymentModel
      .find({
        tenantId,
        status: { $in: ['DUE', 'PARTIAL'] },
        $or: [
          { dueDate: { $exists: false } },
          { dueDate: { $gte: now } },
        ],
      })
      .populate('residentId')
      .exec();

    return pending.map((payment) => this.transformPaymentResponse(payment));
  }

  async getOverduePayments(tenantId: string) {
    const now = new Date();
    const overdue = await this.paymentModel
      .find({
        tenantId,
        status: { $in: ['OVERDUE', 'DUE', 'PARTIAL'] },
        dueDate: { $lt: now },
      })
      .populate('residentId')
      .exec();

    return overdue.map((payment) => this.transformPaymentResponse(payment));
  }

  async generateMonthlyFees(tenantId: string, month: string, residentIds?: string[]) {
    // This would typically be called by a scheduled job
    // For now, it's a placeholder that can be extended
    // You would fetch all active residents and create payment records
    return { message: 'Monthly fee generation not yet implemented' };
  }

  async getPaymentStats(tenantId: string) {
    const total = await this.paymentModel.countDocuments({ tenantId });
    const paid = await this.paymentModel.countDocuments({
      tenantId,
      status: { $in: ['PAID', 'completed'] },
    });
    const pending = await this.paymentModel.countDocuments({
      tenantId,
      status: { $in: ['DUE', 'PARTIAL'] },
    });
    const overdue = await this.paymentModel.countDocuments({
      tenantId,
      status: 'OVERDUE',
    });

    const totalRevenue = await this.paymentModel.aggregate([
      { $match: { tenantId, status: { $in: ['PAID', 'completed'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalPending = await this.paymentModel.aggregate([
      { $match: { tenantId, status: { $in: ['DUE', 'PARTIAL', 'OVERDUE'] } } },
      { $group: { _id: null, total: { $sum: '$amountDue' } } },
    ]);

    return {
      total,
      paid,
      pending,
      overdue,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPending: totalPending[0]?.total || 0,
    };
  }
}

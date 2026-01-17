import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RentPayment, RentPaymentDocument } from '../payments/schemas/rent-payment.schema';
import { Bed, BedDocument } from '../beds/schemas/bed.schema';
import { Resident, ResidentDocument } from '../residents/schemas/resident.schema';
import { Complaint, ComplaintDocument } from '../complaints/schemas/complaint.schema';

@Injectable()
export class InsightsService {
  constructor(
    @InjectModel(RentPayment.name)
    private rentPaymentModel: Model<RentPaymentDocument>,
    @InjectModel(Bed.name)
    private bedModel: Model<BedDocument>,
    @InjectModel(Resident.name)
    private residentModel: Model<ResidentDocument>,
    @InjectModel(Complaint.name)
    private complaintModel: Model<ComplaintDocument>,
  ) {}

  /**
   * Get monthly revenue trend
   * Returns collected rent (paid) and expected rent (all due) per month
   */
  async getRevenueTrend(tenantId: string, months: number = 6) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get all paid rent payments in the date range
    const paidPayments = await this.rentPaymentModel
      .find({
        tenantId: tenantObjectId,
        status: 'PAID',
        month: {
          $gte: this.getMonthString(startDate),
          $lte: this.getMonthString(endDate),
        },
      })
      .select('month amountPaid')
      .exec();

    // Get all rent payments (for expected rent calculation)
    const allPayments = await this.rentPaymentModel
      .find({
        tenantId: tenantObjectId,
        month: {
          $gte: this.getMonthString(startDate),
          $lte: this.getMonthString(endDate),
        },
      })
      .select('month amountDue status')
      .exec();

    // Aggregate by month
    const monthlyData: Record<string, { collected: number; expected: number }> = {};

    // Initialize all months in range
    const monthsList = this.getMonthsList(startDate, endDate);
    monthsList.forEach((month) => {
      monthlyData[month] = { collected: 0, expected: 0 };
    });

    // Sum collected rent
    paidPayments.forEach((payment) => {
      if (monthlyData[payment.month]) {
        monthlyData[payment.month].collected += payment.amountPaid;
      }
    });

    // Sum expected rent (all payments regardless of status)
    allPayments.forEach((payment) => {
      if (monthlyData[payment.month]) {
        monthlyData[payment.month].expected += payment.amountDue;
      }
    });

    // Convert to array format
    return monthsList.map((month) => ({
      month,
      collected: monthlyData[month].collected,
      expected: monthlyData[month].expected,
    }));
  }

  /**
   * Get occupancy trend
   * Returns total beds and occupied beds per month
   */
  async getOccupancyTrend(tenantId: string, months: number = 6) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Get current total beds
    const totalBeds = await this.bedModel.countDocuments({
      tenantId: tenantObjectId,
    });

    // Get residents with their check-in and move-out dates
    const residents = await this.residentModel
      .find({
        tenantId: tenantObjectId,
        bedId: { $exists: true, $ne: null },
      })
      .select('checkInDate moveOutDate bedId status')
      .exec();

    const monthsList = this.getMonthsList(startDate, endDate);
    const monthlyData = monthsList.map((month) => {
      const monthDate = this.parseMonthString(month);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      // Count occupied beds for this month
      const occupied = residents.filter((resident) => {
        const checkIn = new Date(resident.checkInDate);
        const moveOut = resident.moveOutDate ? new Date(resident.moveOutDate) : null;

        // Resident was active during this month
        const wasActive = checkIn <= monthEnd && (!moveOut || moveOut >= monthStart);
        return wasActive && resident.status !== 'VACATED';
      }).length;

      return {
        month,
        total: totalBeds,
        occupied,
        occupancyRate: totalBeds > 0 ? (occupied / totalBeds) * 100 : 0,
      };
    });

    return monthlyData;
  }

  /**
   * Get current month payment summary
   * Returns collected, due, and overdue amounts
   */
  async getPaymentSummary(tenantId: string) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const now = new Date();
    const currentMonth = this.getMonthString(now);

    const payments = await this.rentPaymentModel
      .find({
        tenantId: tenantObjectId,
        month: currentMonth,
      })
      .select('status amountPaid amountDue')
      .exec();

    let collected = 0;
    let due = 0;
    let overdue = 0;

    payments.forEach((payment) => {
      if (payment.status === 'PAID') {
        collected += payment.amountPaid;
      } else if (payment.status === 'OVERDUE') {
        overdue += payment.amountDue - payment.amountPaid;
        due += payment.amountPaid; // Partial payments count as due
      } else if (payment.status === 'DUE' || payment.status === 'PARTIAL') {
        due += payment.amountDue - payment.amountPaid;
      }
    });

    return {
      collected,
      due,
      overdue,
      total: collected + due + overdue,
    };
  }

  /**
   * Get complaints breakdown by status
   */
  async getComplaintsBreakdown(tenantId: string) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const complaints = await this.complaintModel
      .find({ tenantId: tenantObjectId })
      .select('status')
      .exec();

    const breakdown = {
      open: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0,
    };

    complaints.forEach((complaint) => {
      const status = complaint.status as keyof typeof breakdown;
      if (breakdown.hasOwnProperty(status)) {
        breakdown[status]++;
      }
    });

    return breakdown;
  }

  /**
   * Get vacating trend
   * Returns residents vacated per month
   */
  async getVacatingTrend(tenantId: string, months: number = 6) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const residents = await this.residentModel
      .find({
        tenantId: tenantObjectId,
        status: 'VACATED',
        moveOutDate: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .select('moveOutDate')
      .exec();

    const monthsList = this.getMonthsList(startDate, endDate);
    const monthlyData: Record<string, number> = {};

    monthsList.forEach((month) => {
      monthlyData[month] = 0;
    });

    residents.forEach((resident) => {
      if (resident.moveOutDate) {
        const month = this.getMonthString(new Date(resident.moveOutDate));
        if (monthlyData.hasOwnProperty(month)) {
          monthlyData[month]++;
        }
      }
    });

    return monthsList.map((month) => ({
      month,
      count: monthlyData[month],
    }));
  }

  /**
   * Helper: Get month string in YYYY-MM format
   */
  private getMonthString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Helper: Parse month string to Date
   */
  private parseMonthString(month: string): Date {
    const [year, monthNum] = month.split('-').map(Number);
    return new Date(year, monthNum - 1, 1);
  }

  /**
   * Helper: Get list of months between two dates
   */
  private getMonthsList(startDate: Date, endDate: Date): string[] {
    const months: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

    while (current <= endDate) {
      months.push(this.getMonthString(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }
}

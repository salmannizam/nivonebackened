import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Resident, ResidentDocument } from '../residents/schemas/resident.schema';
import { RentPaymentService } from './rent-payment.service';
import { Tenant, TenantDocument } from '../tenants/schemas/tenant.schema';

@Injectable()
export class RentPaymentSchedulerService {
  private readonly logger = new Logger(RentPaymentSchedulerService.name);

  constructor(
    @InjectModel(Resident.name)
    private residentModel: Model<ResidentDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    private rentPaymentService: RentPaymentService,
    private configService: ConfigService,
  ) {}

  /**
   * Run daily at 2 AM to generate rent payments and update overdue status
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleRentPaymentGeneration() {
    this.logger.log('Starting daily rent payment generation...');

    try {
      // Get all tenants
      const tenants = await this.tenantModel.find({ status: 'active' }).exec();

      for (const tenant of tenants) {
        const tenantId = tenant._id instanceof Types.ObjectId 
          ? tenant._id.toString() 
          : (tenant._id as any).toString();
        await this.processTenantRentPayments(tenantId);
      }

      this.logger.log('Rent payment generation completed');
    } catch (error) {
      this.logger.error('Error in rent payment generation:', error);
    }
  }

  /**
   * Process rent payments for a specific tenant
   */
  async processTenantRentPayments(tenantId: string) {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Convert tenantId to ObjectId if it's a string
    const tenantObjectId = typeof tenantId === 'string' 
      ? new Types.ObjectId(tenantId) 
      : tenantId;

    // Get all active residents with bed assignment (exclude VACATED and SUSPENDED)
    // Rent is sourced from bed.rent only - bed assignment is required
    const residents = await this.residentModel
      .find({
        tenantId: tenantObjectId,
        status: { $in: ['ACTIVE', 'NOTICE_GIVEN'] }, // Only generate rent for active or notice-given residents
        bedId: { $exists: true, $ne: null }, // Bed assignment is required
      })
      .populate('bedId') // Populate to validate bed has rent
      .exec();

    this.logger.log(`Processing ${residents.length} residents for tenant ${tenantId}`);

    for (const resident of residents) {
      try {
        // Validate bed exists and has rent (bed.rent is source of truth)
        const bed = (resident as any).bedId;
        if (!bed || !bed.rent || bed.rent <= 0) {
          this.logger.warn(
            `Skipping resident ${resident._id}: Bed does not have valid rent. Bed rent is required for billing.`,
          );
          continue;
        }

        // Calculate due date for current month
        const dueDay = resident.paymentDueDay || 5; // Default to 5th of month
        const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);

        // Generate rent payment if it doesn't exist
        // generateRentPayment will use bed.rent as the source of truth
        await this.rentPaymentService.generateRentPayment(
          tenantId,
          resident,
          currentMonth,
          dueDate,
        );
      } catch (error) {
        this.logger.error(
          `Error generating rent payment for resident ${resident._id}:`,
          error,
        );
      }
    }

    // Update overdue status
    await this.rentPaymentService.updateOverdueStatus(tenantId);
  }

  /**
   * Manual trigger for testing (can be called via API)
   */
  async triggerRentPaymentGeneration(tenantId?: string) {
    if (tenantId) {
      await this.processTenantRentPayments(tenantId);
    } else {
      const tenants = await this.tenantModel.find({ status: 'active' }).exec();
      for (const tenant of tenants) {
        const tid = tenant._id instanceof Types.ObjectId 
          ? tenant._id.toString() 
          : (tenant._id as any).toString();
        await this.processTenantRentPayments(tid);
      }
    }
  }
}

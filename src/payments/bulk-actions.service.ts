import { Injectable, BadRequestException } from '@nestjs/common';
import { RentPaymentService } from './rent-payment.service';
import { ResidentsService } from '../residents/residents.service';
import { BedsService } from '../beds/beds.service';

export interface BulkActionResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

@Injectable()
export class BulkActionsService {
  constructor(
    private rentPaymentService: RentPaymentService,
    private residentsService: ResidentsService,
    private bedsService: BedsService,
  ) {}

  /**
   * Bulk mark rent payments as PAID
   */
  async bulkMarkRentPaid(
    tenantId: string,
    paymentIds: string[],
    paymentMode?: string,
    paidDate?: Date,
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const paymentId of paymentIds) {
      try {
        // Get payment to get amountDue
        const payment = await this.rentPaymentService.findOne(paymentId, tenantId);
        
        await this.rentPaymentService.updatePaymentStatus(paymentId, tenantId, {
          amountPaid: payment.amountDue,
          paidDate: paidDate || new Date(),
          paymentMode: paymentMode || 'cash',
        });
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          id: paymentId,
          error: error.message || 'Failed to mark payment as paid',
        });
      }
    }

    return result;
  }

  /**
   * Bulk vacate residents
   */
  async bulkVacateResidents(
    tenantId: string,
    residentIds: string[],
    moveOutDate: Date,
    moveOutReason?: string,
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const residentId of residentIds) {
      try {
        await this.residentsService.vacate(residentId, tenantId, {
          moveOutDate,
          moveOutReason: moveOutReason || 'Bulk vacate',
        });
        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          id: residentId,
          error: error.message || 'Failed to vacate resident',
        });
      }
    }

    return result;
  }

  /**
   * Bulk assign beds to residents
   */
  async bulkAssignBeds(
    tenantId: string,
    assignments: Array<{ residentId: string; bedId: string }>,
  ): Promise<BulkActionResult> {
    const result: BulkActionResult = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (const assignment of assignments) {
      try {
        // Verify bed is available
        const bed = await this.bedsService.findOne(assignment.bedId, tenantId);
        if (bed.status !== 'AVAILABLE') {
          throw new BadRequestException(`Bed ${bed.bedNumber} is not available`);
        }

        // Update resident with bed assignment
        await this.residentsService.update(assignment.residentId, {
          bedId: assignment.bedId,
        }, tenantId);

        // Update bed status to OCCUPIED
        await this.bedsService.update(assignment.bedId, { status: 'OCCUPIED' }, tenantId);

        result.success++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          id: assignment.residentId,
          error: error.message || 'Failed to assign bed',
        });
      }
    }

    return result;
  }
}

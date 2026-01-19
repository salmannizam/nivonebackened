import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resident, ResidentDocument } from '../residents/schemas/resident.schema';
import { ResidentsService } from '../residents/residents.service';
import { RentPaymentService } from '../payments/rent-payment.service';
import { ExtraPaymentService } from '../payments/extra-payment.service';
import { SecurityDepositService } from '../payments/security-deposit.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { NoticesService } from '../notices/notices.service';
import { GatePassesService } from '../gate-passes/gate-passes.service';
import { VisitorsService } from '../visitors/visitors.service';

@Injectable()
export class ResidentPortalService {
  constructor(
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    private residentsService: ResidentsService,
    private rentPaymentService: RentPaymentService,
    private extraPaymentService: ExtraPaymentService,
    private securityDepositService: SecurityDepositService,
    private complaintsService: ComplaintsService,
    private noticesService: NoticesService,
    private gatePassesService: GatePassesService,
    private visitorsService: VisitorsService,
  ) {}

  /**
   * Get dashboard summary for resident
   */
  async getDashboard(residentId: string, tenantId: string) {
    const resident = await this.residentsService.findOne(residentId, tenantId);
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    // Get rent payments summary
    const rentPayments = await this.rentPaymentService.findAll(tenantId, {
      residentId,
    });
    const totalDue = rentPayments
      .filter((p: any) => p.status === 'PENDING' || p.status === 'OVERDUE')
      .reduce((sum: number, p: any) => sum + (p.dueAmount || 0), 0);
    
    const totalPaid = rentPayments
      .filter((p: any) => p.status === 'PAID')
      .reduce((sum: number, p: any) => sum + (p.paidAmount || 0), 0);

    // Get security deposit
    const securityDeposit = await this.securityDepositService.findByResident(tenantId, residentId);

    // Get pending complaints count
    const complaints = await this.complaintsService.findAll(tenantId, {
      residentId,
      status: 'OPEN',
    });

    // Get active gate passes
    const gatePasses = await this.gatePassesService.findAll(tenantId, {
      residentId,
      status: 'ACTIVE',
    });

    return {
      resident: {
        name: resident.name,
        phone: resident.phone,
        email: resident.email,
        roomNumber: resident.roomNumber,
        bedNumber: resident.bedNumber,
        checkInDate: resident.checkInDate,
      },
      summary: {
        totalDue,
        totalPaid,
        securityDeposit: securityDeposit?.amount || 0,
        pendingComplaints: complaints.length,
        activeGatePasses: gatePasses.length,
      },
    };
  }

  /**
   * Get resident's stay information
   */
  async getMyStay(residentId: string, tenantId: string) {
    return await this.residentsService.findOne(residentId, tenantId);
  }

  /**
   * Get resident's payments
   */
  async getPayments(residentId: string, tenantId: string) {
    const rentPayments = await this.rentPaymentService.findAll(tenantId, {
      residentId,
    });
    const extraPayments = await this.extraPaymentService.findAll(tenantId, {
      residentId,
    });
    const securityDeposit = await this.securityDepositService.findByResident(tenantId, residentId);

    return {
      rentPayments,
      extraPayments,
      securityDeposit,
    };
  }

  /**
   * Get resident's complaints (only their own)
   */
  async getComplaints(residentId: string, tenantId: string) {
    return await this.complaintsService.findAll(tenantId, {
      residentId,
    });
  }

  /**
   * Get notices for resident's tenant
   */
  async getNotices(residentId: string, tenantId: string) {
    // Get all published notices for the tenant
    return await this.noticesService.findAll(tenantId, {
      status: 'PUBLISHED',
    });
  }

  /**
   * Get resident's gate passes
   */
  async getGatePasses(residentId: string, tenantId: string) {
    return await this.gatePassesService.findAll(tenantId, {
      residentId,
    });
  }

  /**
   * Get visitors for resident
   */
  async getVisitors(residentId: string, tenantId: string) {
    return await this.visitorsService.findAll(tenantId, {
      residentId,
    });
  }
}

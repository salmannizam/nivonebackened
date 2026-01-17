import { Injectable } from '@nestjs/common';
import { ResidentsService } from '../residents/residents.service';
import { PaymentsService } from '../payments/payments.service';
import { RentPaymentService } from '../payments/rent-payment.service';
import { SecurityDepositService } from '../payments/security-deposit.service';
import { RoomsService } from '../rooms/rooms.service';
import { ComplaintsService } from '../complaints/complaints.service';
import { VisitorsService } from '../visitors/visitors.service';
import { BedsService } from '../beds/beds.service';
import { StaffService } from '../staff/staff.service';
import { AssetsService } from '../assets/assets.service';
import { GatePassesService } from '../gate-passes/gate-passes.service';

@Injectable()
export class ReportsService {
  constructor(
    private residentsService: ResidentsService,
    private paymentsService: PaymentsService,
    private rentPaymentService: RentPaymentService,
    private securityDepositService: SecurityDepositService,
    private roomsService: RoomsService,
    private complaintsService: ComplaintsService,
    private visitorsService: VisitorsService,
    private bedsService: BedsService,
    private staffService: StaffService,
    private assetsService: AssetsService,
    private gatePassesService: GatePassesService,
  ) {}

  async getDashboardStats(tenantId: string) {
    try {
      const [
        residents,
        rooms,
        complaints,
        visitors,
        bedStats,
        staffStats,
        assetStats,
        rentPayments,
        dueToday,
        dueNext7Days,
        overdue,
        pendingSummary,
        activeGatePasses,
        overdueGatePasses,
        securityDeposits,
      ] = await Promise.all([
      this.residentsService.findAll(tenantId),
      this.roomsService.findAll(tenantId),
      this.complaintsService.findAll(tenantId),
      this.visitorsService.findAll(tenantId, { date: new Date() }),
      this.bedsService.getBedStats(tenantId),
      this.staffService.getStats(tenantId),
      this.assetsService.getStats(tenantId),
      this.rentPaymentService.findAll(tenantId),
      this.rentPaymentService.getDueToday(tenantId),
      this.rentPaymentService.getDueInNext7Days(tenantId),
      this.rentPaymentService.getOverdue(tenantId),
      this.rentPaymentService.getPendingSummary(tenantId),
      this.gatePassesService.getActivePasses(tenantId),
      this.gatePassesService.getOverduePasses(tenantId),
      this.securityDepositService.findAll(tenantId, { received: true }),
    ]);

    const activeResidents = residents.filter((r) => r.status === 'ACTIVE');
    const vacatedResidents = residents.filter((r) => r.status === 'VACATED');
    const noticeGivenResidents = residents.filter((r) => r.status === 'NOTICE_GIVEN');
    
    // Get vacated residents this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const vacatedThisMonth = vacatedResidents.filter((r) => {
      if (!r.moveOutDate) return false;
      const moveOutDate = new Date(r.moveOutDate);
      return moveOutDate >= startOfMonth;
    }).length;
    
    // Calculate total security deposit held (HELD and PARTIALLY_REFUNDED status)
    const totalSecurityDepositHeld = securityDeposits
      .filter((d) => d.status === 'HELD' || d.status === 'PARTIALLY_REFUNDED')
      .reduce((sum, d) => {
        if (d.status === 'PARTIALLY_REFUNDED' && d.refundAmount) {
          return sum + (d.amount - d.refundAmount); // Remaining amount
        }
        return sum + d.amount;
      }, 0);
    
    // Get residents with pending settlements
    const pendingSettlements = vacatedResidents.filter((r) => !r.settlementCompleted).length;
    
    // Get beds becoming available soon (residents with NOTICE_GIVEN status)
    const bedsBecomingAvailable = noticeGivenResidents.length;
    
    // Get complaints pending > 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const complaintsPending3Days = complaints.filter((c) => {
      if (c.status !== 'open' && c.status !== 'in_progress') return false;
      const createdDate = new Date(c.createdAt || c.createdAt);
      return createdDate < threeDaysAgo;
    }).length;
    const totalRooms = rooms.length;
    const occupiedRooms = rooms.filter((r) => r.occupied > 0).length;
    const availableRooms = totalRooms - occupiedRooms;
    const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
    const totalOccupied = rooms.reduce((sum, r) => sum + r.occupied, 0);
    const occupancyRate = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

    // Calculate revenue from paid rent payments
    const paidRentPayments = rentPayments.filter((p) => p.status === 'PAID');
    const totalRevenue = paidRentPayments.reduce((sum, p) => sum + p.amountPaid, 0);

    const openComplaints = complaints.filter((c) => c.status === 'open').length;
    const todayVisitors = visitors.filter((v) => {
      const visitDate = new Date(v.visitDate);
      const today = new Date();
      return (
        visitDate.getDate() === today.getDate() &&
        visitDate.getMonth() === today.getMonth() &&
        visitDate.getFullYear() === today.getFullYear()
      );
    }).length;

    // Get residents vacating soon (next 30 days) - using expectedVacateDate or moveOutDate
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const residentsVacatingSoon = residents.filter((r) => {
      if (r.status === 'VACATED') return false;
      const vacateDate = r.expectedVacateDate 
        ? new Date(r.expectedVacateDate)
        : (r.status === 'NOTICE_GIVEN' ? new Date() : null);
      if (!vacateDate) return false;
      return vacateDate <= thirtyDaysFromNow && vacateDate >= new Date();
    }).length;

    const result = {
      residents: {
        total: residents.length,
        active: activeResidents.length,
        vacatedThisMonth: vacatedThisMonth,
        vacatingSoon: residentsVacatingSoon,
      },
      rooms: {
        total: totalRooms,
        occupied: occupiedRooms,
        available: availableRooms,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      },
      beds: {
        total: bedStats.total,
        available: bedStats.available,
        occupied: bedStats.occupied,
        maintenance: bedStats.maintenance,
        occupancyRate: bedStats.occupancyRate,
        becomingAvailableSoon: bedsBecomingAvailable,
      },
      payments: {
        total: rentPayments.length,
        paid: paidRentPayments.length,
        pending: pendingSummary.count,
        overdue: overdue.length,
        revenue: totalRevenue,
        totalPending: pendingSummary.totalAmount,
        dueToday: dueToday.length,
        dueNext7Days: dueNext7Days.length,
      },
      securityDeposits: {
        totalHeld: totalSecurityDepositHeld,
        count: securityDeposits.filter((d) => d.status === 'HELD' || d.status === 'PARTIALLY_REFUNDED').length,
      },
      complaints: {
        total: complaints.length,
        open: openComplaints,
        pending3Days: complaintsPending3Days,
      },
      visitors: {
        today: todayVisitors,
      },
      staff: {
        total: staffStats.total,
        active: staffStats.active,
        inactive: staffStats.inactive,
        byRole: staffStats.byRole,
      },
      assets: {
        total: assetStats.total,
        working: assetStats.working,
        repair: assetStats.repair,
        maintenanceDue: assetStats.maintenanceDue,
      },
      gatePasses: {
        active: activeGatePasses.length,
        overdue: overdueGatePasses.length,
      },
      attentionNeeded: {
        overdueRent: overdue.length,
        complaintsPending: openComplaints,
        complaintsPending3Days: complaintsPending3Days,
        bedsUnderMaintenance: bedStats.maintenance,
        residentsVacatingSoon: residentsVacatingSoon,
      },
    };
    
    return result;
    } catch (error: any) {
      console.error('ReportsService.getDashboardStats - Error:', error.message, error.stack);
      throw error;
    }
  }

  async getOccupancyReport(tenantId: string) {
    const rooms = await this.roomsService.findAll(tenantId);
    return rooms.map((room) => ({
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      occupied: room.occupied,
      available: room.capacity - room.occupied,
      occupancyRate: room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0,
    }));
  }

  async getRevenueReport(tenantId: string, startDate?: Date, endDate?: Date) {
    return this.paymentsService.getSummary(tenantId, startDate, endDate);
  }
}

import { Injectable } from '@nestjs/common';
import { ResidentsService } from '../residents/residents.service';
import { PaymentsService } from '../payments/payments.service';
import { RentPaymentService } from '../payments/rent-payment.service';
import { SecurityDepositService } from '../payments/security-deposit.service';
import { BedsService } from '../beds/beds.service';
import { RoomsService } from '../rooms/rooms.service';
import { StaffService } from '../staff/staff.service';
import { AssetsService } from '../assets/assets.service';
import { GatePassesService } from '../gate-passes/gate-passes.service';

@Injectable()
export class ExportService {
  constructor(
    private residentsService: ResidentsService,
    private paymentsService: PaymentsService,
    private rentPaymentService: RentPaymentService,
    private securityDepositService: SecurityDepositService,
    private bedsService: BedsService,
    private roomsService: RoomsService,
    private staffService: StaffService,
    private assetsService: AssetsService,
    private gatePassesService: GatePassesService,
  ) {}

  async exportResidents(tenantId: string): Promise<any[]> {
    const residents = await this.residentsService.findAll(tenantId);
    const beds = await this.bedsService.findAll(tenantId);
    
    return residents.map((r) => {
      // Find bed to get rent (bed.rent is source of truth)
      const bed = beds.find((b) => b._id.toString() === r.bedId?.toString());
      const monthlyRent = bed?.rent || 0;
      
      return {
        Name: r.name,
        Email: r.email || '',
        Phone: r.phone,
        'Alternate Phone': r.alternatePhone || '',
        'Room Number': r.roomNumber || '',
        'Bed Number': r.bedNumber || '',
        'Check In Date': r.checkInDate ? new Date(r.checkInDate).toLocaleDateString() : '',
        'Check Out Date': r.checkOutDate ? new Date(r.checkOutDate).toLocaleDateString() : '',
        Status: r.status,
        'Monthly Rent': monthlyRent, // Rent sourced from bed.rent only
        Deposit: r.deposit || 0,
        Address: r.address || '',
        'Emergency Contact': r.emergencyContact
          ? `${r.emergencyContact.name} (${r.emergencyContact.phone})`
          : '',
      };
    });
  }

  async exportPayments(tenantId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const payments = await this.paymentsService.findAll(tenantId);
    let filtered = payments;
    if (startDate || endDate) {
      filtered = payments.filter((p) => {
        const paymentDate = new Date(p.paymentDate);
        if (startDate && paymentDate < startDate) return false;
        if (endDate && paymentDate > endDate) return false;
        return true;
      });
    }

    return filtered.map((p) => ({
      'Resident Name': p.residentName || '',
      Amount: p.amount,
      'Amount Due': p.amountDue || p.amount,
      'Amount Paid': p.amountPaid || p.amount,
      'Payment Type': p.paymentType,
      'Payment Method': p.paymentMethod,
      'Payment Date': p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : '',
      'Due Date': p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
      Status: p.status,
      Month: p.month || '',
      'Transaction ID': p.transactionId || '',
      Notes: p.notes || '',
    }));
  }

  async exportRentPayments(tenantId: string, filters?: { status?: string; dueToday?: boolean; overdue?: boolean }): Promise<any[]> {
    let payments;
    if (filters?.dueToday) {
      payments = await this.rentPaymentService.getDueToday(tenantId);
    } else if (filters?.overdue) {
      payments = await this.rentPaymentService.getOverdue(tenantId);
    } else {
      payments = await this.rentPaymentService.findAll(tenantId, { status: filters?.status });
    }

    return payments.map((p) => ({
      'Resident Name': p.residentName || '',
      'Room Number': p.roomNumber || '',
      'Bed Number': p.bedNumber || '',
      Month: p.month,
      'Amount Due': p.amountDue,
      'Amount Paid': p.amountPaid,
      'Due Date': p.dueDate ? new Date(p.dueDate).toLocaleDateString() : '',
      'Paid Date': p.paidDate ? new Date(p.paidDate).toLocaleDateString() : '',
      Status: p.status,
      'Payment Mode': p.paymentMode || '',
      Notes: p.notes || '',
    }));
  }

  async exportSecurityDeposits(tenantId: string): Promise<any[]> {
    const deposits = await this.securityDepositService.findAll(tenantId);
    return deposits.map((d) => ({
      'Resident Name': d.residentName || '',
      'Room Number': d.roomNumber || '',
      'Bed Number': d.bedNumber || '',
      Amount: d.amount,
      Status: d.status,
      Received: d.received ? 'Yes' : 'No',
      'Received Date': d.receivedDate ? new Date(d.receivedDate).toLocaleDateString() : '',
      'Payment Mode': d.paymentMode || '',
      Refunded: d.refunded ? 'Yes' : 'No',
      'Refund Date': d.refundDate ? new Date(d.refundDate).toLocaleDateString() : '',
      'Refund Amount': d.refundAmount || 0,
      'Deduction Amount': d.deductionAmount || 0,
      'Deduction Reason': d.deductionReason || '',
      Notes: d.notes || '',
    }));
  }

  async exportBeds(tenantId: string): Promise<any[]> {
    const beds = await this.bedsService.findAll(tenantId);
    return beds.map((b) => ({
      'Room Number': b.roomNumber || '',
      'Bed Number': b.bedNumber,
      Rent: b.rent,
      Status: b.status,
      Notes: b.notes || '',
    }));
  }

  async exportRooms(tenantId: string): Promise<any[]> {
    const rooms = await this.roomsService.findAll(tenantId);
    return rooms.map((r) => ({
      'Room Number': r.roomNumber,
      Floor: r.floor || '',
      Capacity: r.capacity,
      Occupied: r.occupied,
      Available: r.capacity - r.occupied,
      'Room Type': r.roomType || '',
      'Default Bed Rent': r.defaultBedRent || 0, // Template only, not used for billing
      'Is Available': r.isAvailable ? 'Yes' : 'No',
      Amenities: r.amenities ? r.amenities.join(', ') : '',
    }));
  }

  async exportStaff(tenantId: string): Promise<any[]> {
    const staff = await this.staffService.findAll(tenantId);
    return staff.map((s) => ({
      Name: s.name,
      Phone: s.phone,
      Email: s.email || '',
      Role: s.role,
      Shift: s.shift || '',
      'Is Active': s.isActive ? 'Yes' : 'No',
      Address: s.address || '',
      Salary: s.salary || 0,
      'Joining Date': s.joiningDate ? new Date(s.joiningDate).toLocaleDateString() : '',
      Notes: s.notes || '',
    }));
  }

  async exportAssets(tenantId: string): Promise<any[]> {
    const assets = await this.assetsService.findAll(tenantId);
    return assets.map((a) => ({
      Name: a.name,
      Category: a.category || '',
      'Room Number': a.roomNumber || '',
      Location: a.location || '',
      Brand: a.brand || '',
      Model: a.model || '',
      'Serial Number': a.serialNumber || '',
      'Purchase Date': a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : '',
      'Warranty Expiry': a.warrantyExpiry ? new Date(a.warrantyExpiry).toLocaleDateString() : '',
      Status: a.status,
      'Last Maintenance': a.lastMaintenanceDate
        ? new Date(a.lastMaintenanceDate).toLocaleDateString()
        : '',
      'Next Maintenance': a.nextMaintenanceDate
        ? new Date(a.nextMaintenanceDate).toLocaleDateString()
        : '',
      Notes: a.notes || '',
    }));
  }

  async exportGatePasses(tenantId: string, startDate?: Date, endDate?: Date): Promise<any[]> {
    const gatePasses = await this.gatePassesService.findAll(tenantId);
    let filtered = gatePasses;
    if (startDate || endDate) {
      filtered = gatePasses.filter((gp) => {
        const exitTime = new Date(gp.exitTime);
        if (startDate && exitTime < startDate) return false;
        if (endDate && exitTime > endDate) return false;
        return true;
      });
    }

    return filtered.map((gp) => ({
      'Resident Name': gp.residentName || '',
      'Exit Time': gp.exitTime ? new Date(gp.exitTime).toLocaleString() : '',
      'Expected Return': gp.expectedReturnTime
        ? new Date(gp.expectedReturnTime).toLocaleString()
        : '',
      'Actual Return': gp.actualReturnTime ? new Date(gp.actualReturnTime).toLocaleString() : '',
      Purpose: gp.purpose || '',
      Destination: gp.destination || '',
      'Contact Person': gp.contactPerson || '',
      'Contact Phone': gp.contactPhone || '',
      Status: gp.status,
      Notes: gp.notes || '',
    }));
  }

  // Convert to CSV format
  convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }
}

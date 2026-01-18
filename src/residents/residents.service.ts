import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Resident, ResidentDocument } from './schemas/resident.schema';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { VacateResidentDto } from './dto/vacate-resident.dto';
import { RoomsService } from '../rooms/rooms.service';
import { BedsService } from '../beds/beds.service';
import { SecurityDepositService } from '../payments/security-deposit.service';
import { RentPaymentService } from '../payments/rent-payment.service';
import { ExtraPaymentService } from '../payments/extra-payment.service';
import { PlanLimitService, LimitType } from '../common/services/plan-limit.service';

@Injectable()
export class ResidentsService {
  constructor(
    @InjectModel(Resident.name) private residentModel: Model<ResidentDocument>,
    private roomsService: RoomsService,
    private bedsService: BedsService,
    private securityDepositService: SecurityDepositService,
    private rentPaymentService: RentPaymentService,
    private extraPaymentService: ExtraPaymentService,
    private eventEmitter: EventEmitter2,
    private planLimitService: PlanLimitService,
  ) {}

  async create(createResidentDto: CreateResidentDto, tenantId: string): Promise<any> {
    // Check plan limit for residents
    const currentResidentCount = await this.residentModel.countDocuments({ tenantId }).exec();
    await this.planLimitService.checkLimit(tenantId, LimitType.RESIDENTS, currentResidentCount);

    // Bed assignment is now REQUIRED - rent is sourced from bed.rent only
    if (!createResidentDto.bedId) {
      throw new BadRequestException('Bed assignment is required. Rent is calculated from bed rent only.');
    }

    // Check bed availability and validate bed has rent
    const bed = await this.bedsService.findOne(createResidentDto.bedId, tenantId);
    if (bed.status !== 'AVAILABLE') {
      throw new BadRequestException('Bed is not available');
    }
    if (!bed.rent || bed.rent <= 0) {
      throw new BadRequestException('Bed must have a valid rent amount. Rent is required for billing.');
    }

    // Verify bed belongs to the specified room
    if (bed.roomId.toString() !== createResidentDto.roomId) {
      throw new BadRequestException('Bed does not belong to the specified room');
    }

    const resident = new this.residentModel({
      ...createResidentDto,
      tenantId,
      status: 'ACTIVE', // Default status on creation
    });
    const savedResident = await resident.save();

    // Update bed status to OCCUPIED
    await this.bedsService.update(
      createResidentDto.bedId,
      { status: 'OCCUPIED' },
      tenantId,
    );

    // Update room occupancy count
    const room = await this.roomsService.findOne(createResidentDto.roomId, tenantId);
    await this.roomsService.update(
      createResidentDto.roomId,
      { occupied: room.occupied + 1 },
      tenantId,
    );

    // Create security deposit if amount is provided
    if (createResidentDto.deposit && createResidentDto.deposit > 0) {
      await this.securityDepositService.createOrUpdate({
        tenantId,
        residentId: savedResident._id.toString(),
        amount: createResidentDto.deposit,
        received: createResidentDto.depositReceived || false,
        receivedDate: createResidentDto.depositReceived ? new Date() : undefined,
      });
      
      // Emit security deposit received event if deposit was received
      if (createResidentDto.depositReceived) {
        this.eventEmitter.emit('security_deposit.received', {
          tenantId,
          residentId: savedResident._id.toString(),
          residentEmail: createResidentDto.email,
          residentPhone: createResidentDto.phone,
          amount: createResidentDto.deposit,
        });
      }
    }

    // Populate and transform response
    const populated = await this.residentModel
      .findById(savedResident._id)
      .populate('roomId')
      .populate('bedId')
      .exec();
    
    if (!populated) {
      return savedResident;
    }

    const residentObj = populated.toObject ? populated.toObject() : populated;
    const populatedRoom = residentObj.roomId as any;
    const populatedBed = residentObj.bedId as any;

    // Emit resident created event
    this.eventEmitter.emit('resident.created', {
      tenantId,
      residentId: savedResident._id.toString(),
      residentEmail: createResidentDto.email,
      residentPhone: createResidentDto.phone,
    });

    // Emit resident assigned room event
    this.eventEmitter.emit('resident.assigned_room', {
      tenantId,
      residentId: savedResident._id.toString(),
      residentEmail: createResidentDto.email,
      residentPhone: createResidentDto.phone,
      roomNumber: populatedRoom?.roomNumber || createResidentDto.roomId,
    });
    return {
      ...residentObj,
      roomNumber: populatedRoom?.roomNumber || null,
      roomId: populatedRoom?._id || residentObj.roomId,
      bedNumber: populatedBed?.bedNumber || null,
      bedId: populatedBed?._id || residentObj.bedId,
    };
  }

  async findAll(
    tenantId: string,
    filters?: {
      roomId?: string;
      bedId?: string;
      status?: string;
      buildingId?: string;
      search?: string;
      checkInDateFrom?: Date;
      checkInDateTo?: Date;
    },
  ) {
    const query: any = { tenantId };
    
    if (filters?.roomId) {
      query.roomId = filters.roomId;
    }
    if (filters?.bedId) {
      query.bedId = filters.bedId;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.checkInDateFrom || filters?.checkInDateTo) {
      query.checkInDate = {};
      if (filters.checkInDateFrom) {
        query.checkInDate.$gte = filters.checkInDateFrom;
      }
      if (filters.checkInDateTo) {
        query.checkInDate.$lte = filters.checkInDateTo;
      }
    }
    
    let residents = await this.residentModel.find(query).populate('roomId').populate('bedId').exec();
    
    // Apply search filter (name, phone, email)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      residents = residents.filter((r: any) => {
        const residentObj = r.toObject ? r.toObject() : r;
        return (
          residentObj.name?.toLowerCase().includes(searchLower) ||
          residentObj.phone?.includes(filters.search) ||
          residentObj.email?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Filter by building if specified
    if (filters?.buildingId) {
      residents = residents.filter((r: any) => {
        const residentObj = r.toObject ? r.toObject() : r;
        const room = residentObj.roomId as any;
        return room?.buildingId?.toString() === filters.buildingId;
      });
    }
    // Transform to include roomNumber and bedNumber
    return residents.map((resident: any) => {
      const residentObj = resident.toObject ? resident.toObject() : resident;
      const room = residentObj.roomId as any;
      const bed = residentObj.bedId as any;
      return {
        ...residentObj,
        roomNumber: room?.roomNumber || null,
        roomId: room?._id || residentObj.roomId,
        bedNumber: bed?.bedNumber || null,
        bedId: bed?._id || residentObj.bedId,
      };
    });
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const resident = await this.residentModel
      .findOne({ _id: id, tenantId })
      .populate('roomId')
      .populate('bedId')
      .exec();
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }
    const residentObj = resident.toObject ? resident.toObject() : resident;
    const room = residentObj.roomId as any;
    const bed = residentObj.bedId as any;
    return {
      ...residentObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || residentObj.roomId,
      bedNumber: bed?.bedNumber || null,
      bedId: bed?._id || residentObj.bedId,
    };
  }

  async update(id: string, updateResidentDto: UpdateResidentDto, tenantId: string): Promise<any> {
    const resident = await this.residentModel
      .findOneAndUpdate({ _id: id, tenantId }, updateResidentDto, { new: true })
      .populate('roomId')
      .populate('bedId')
      .exec();
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }
    const residentObj = resident.toObject ? resident.toObject() : resident;
    const room = residentObj.roomId as any;
    const bed = residentObj.bedId as any;
    return {
      ...residentObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || residentObj.roomId,
      bedNumber: bed?.bedNumber || null,
      bedId: bed?._id || residentObj.bedId,
    };
  }

  async remove(id: string, tenantId: string) {
    const resident = await this.findOne(id, tenantId);
    const result = await this.residentModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Resident not found');
    }

    // Free up bed if bedId exists
    if (resident.bedId) {
      await this.bedsService.update(
        resident.bedId.toString(),
        { status: 'AVAILABLE' },
        tenantId,
      );
    } else {
      // Update room occupancy (legacy mode)
      const room = await this.roomsService.findOne(resident.roomId.toString(), tenantId);
      await this.roomsService.update(
        resident.roomId.toString(),
        { occupied: Math.max(0, room.occupied - 1) },
        tenantId,
      );
    }

    return result;
  }

  async checkOut(id: string, tenantId: string, checkOutDate?: Date): Promise<any> {
    const resident = await this.findOne(id, tenantId);
    const updated = await this.residentModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        {
          status: 'VACATED',
          checkOutDate: checkOutDate || new Date(),
          moveOutDate: checkOutDate || new Date(),
        },
        { new: true },
      )
      .populate('roomId')
      .populate('bedId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Resident not found');
    }

    // Free up bed if bedId exists
    if (resident.bedId) {
      await this.bedsService.update(
        resident.bedId.toString(),
        { status: 'AVAILABLE' },
        tenantId,
      );
    } else {
      // Update room occupancy (legacy mode)
      const room = await this.roomsService.findOne(resident.roomId.toString(), tenantId);
      await this.roomsService.update(
        resident.roomId.toString(),
        { occupied: Math.max(0, room.occupied - 1) },
        tenantId,
      );
    }

    const updatedObj = updated.toObject ? updated.toObject() : updated;
    const room = updatedObj.roomId as any;
    const bed = updatedObj.bedId as any;
    return {
      ...updatedObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || updatedObj.roomId,
      bedNumber: bed?.bedNumber || null,
      bedId: bed?._id || updatedObj.bedId,
    };
  }

  /**
   * Vacate a resident with settlement handling
   * This is the proper move-out flow with financial settlement
   */
  async vacate(id: string, tenantId: string, vacateDto: VacateResidentDto): Promise<any> {
    const resident = await this.findOne(id, tenantId);

    if (resident.status === 'VACATED') {
      throw new BadRequestException('Resident is already vacated');
    }

    // Get pending rent payments
    const pendingRentPayments = await this.rentPaymentService.findAll(tenantId, {
      residentId: id,
      status: 'DUE',
    });

    // Get overdue rent payments
    const overdueRentPayments = await this.rentPaymentService.findAll(tenantId, {
      residentId: id,
      status: 'OVERDUE',
    });

    // Get partial rent payments
    const partialRentPayments = await this.rentPaymentService.findAll(tenantId, {
      residentId: id,
      status: 'PARTIAL',
    });

    // Calculate total pending rent
    const totalPendingRent = [
      ...pendingRentPayments,
      ...overdueRentPayments,
      ...partialRentPayments,
    ].reduce((sum, payment) => {
      return sum + (payment.amountDue - payment.amountPaid);
    }, 0);

    // Get security deposit
    let securityDeposit;
    try {
      securityDeposit = await this.securityDepositService.findByResident(id, tenantId);
    } catch (error) {
      // Security deposit may not exist
      securityDeposit = null;
    }

    // Update resident status
    const updated = await this.residentModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        {
          status: 'VACATED',
          moveOutDate: vacateDto.moveOutDate,
          moveOutReason: vacateDto.moveOutReason,
          checkOutDate: vacateDto.moveOutDate,
          settlementCompleted: false, // Will be marked true after settlement
        },
        { new: true },
      )
      .populate('roomId')
      .populate('bedId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Resident not found');
    }

    // Free up bed if bedId exists
    if (resident.bedId) {
      await this.bedsService.update(
        resident.bedId.toString(),
        { status: 'AVAILABLE' },
        tenantId,
      );
    } else {
      // Update room occupancy (legacy mode)
      const room = await this.roomsService.findOne(resident.roomId.toString(), tenantId);
      await this.roomsService.update(
        resident.roomId.toString(),
        { occupied: Math.max(0, room.occupied - 1) },
        tenantId,
      );
    }

    // Emit resident vacated event
    this.eventEmitter.emit('resident.vacated', {
      tenantId,
      residentId: id,
      residentEmail: resident.email,
      residentPhone: resident.phone,
    });

    // Process security deposit refund if applicable
    if (securityDeposit && !securityDeposit.refunded) {
      await this.securityDepositService.processRefund(
        securityDeposit._id.toString(),
        tenantId,
        {
          refundDate: vacateDto.moveOutDate,
          refundAmount: securityDeposit.amount - (vacateDto.depositDeductionAmount || 0),
          deductionAmount: vacateDto.depositDeductionAmount,
          deductionReason: vacateDto.depositDeductionReason,
          notes: vacateDto.settlementNotes,
        },
      );
    }

    const updatedObj = updated.toObject ? updated.toObject() : updated;
    const room = updatedObj.roomId as any;
    const bed = updatedObj.bedId as any;

    return {
      ...updatedObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || updatedObj.roomId,
      bedNumber: bed?.bedNumber || null,
      bedId: bed?._id || updatedObj.bedId,
      settlement: {
        pendingRent: totalPendingRent,
        securityDeposit: securityDeposit ? securityDeposit.amount : 0,
        depositDeduction: vacateDto.depositDeductionAmount || 0,
        pendingRentPayments: pendingRentPayments.length,
        overdueRentPayments: overdueRentPayments.length,
        partialRentPayments: partialRentPayments.length,
      },
    };
  }

  /**
   * Mark settlement as completed after final review
   */
  async completeSettlement(id: string, tenantId: string): Promise<any> {
    const resident = await this.findOne(id, tenantId);

    if (resident.status !== 'VACATED') {
      throw new BadRequestException('Resident must be vacated before completing settlement');
    }

    const updated = await this.residentModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        { settlementCompleted: true },
        { new: true },
      )
      .populate('roomId')
      .populate('bedId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Resident not found');
    }

    const updatedObj = updated.toObject ? updated.toObject() : updated;
    const room = updatedObj.roomId as any;
    const bed = updatedObj.bedId as any;
    return {
      ...updatedObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || updatedObj.roomId,
      bedNumber: bed?.bedNumber || null,
      bedId: bed?._id || updatedObj.bedId,
    };
  }
}

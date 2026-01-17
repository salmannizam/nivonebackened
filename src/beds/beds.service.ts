import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bed, BedDocument } from './schemas/bed.schema';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedDto } from './dto/update-bed.dto';
import { RoomDocument } from '../rooms/schemas/room.schema';

@Injectable()
export class BedsService {
  constructor(
    @InjectModel(Bed.name) private bedModel: Model<BedDocument>,
    @InjectModel('Room') private roomModel: Model<RoomDocument>,
  ) {}

  private transformBedResponse(bed: BedDocument): any {
    const bedObj = bed.toObject();
    const room = bedObj.roomId as unknown as RoomDocument;
    return {
      ...bedObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || bedObj.roomId,
    };
  }

  async create(createBedDto: CreateBedDto, tenantId: string) {
    // Check if bed number already exists in this room
    const existing = await this.bedModel.findOne({
      tenantId,
      roomId: createBedDto.roomId,
      bedNumber: createBedDto.bedNumber,
    });

    if (existing) {
      throw new BadRequestException('Bed number already exists in this room');
    }

    // Verify room exists and get defaultBedRent if rent not provided
    const room = await this.roomModel.findOne({
      _id: createBedDto.roomId,
      tenantId,
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // Use room.defaultBedRent as default if bed rent not provided
    // This is a template value, not used for billing - bed.rent is the source of truth
    let bedRent = createBedDto.rent;
    if (!bedRent && room.defaultBedRent) {
      bedRent = room.defaultBedRent;
    }

    // Validate bed rent is provided (either explicitly or from room default)
    if (!bedRent || bedRent <= 0) {
      throw new BadRequestException('Bed rent is required. Either provide rent directly or set defaultBedRent on the room.');
    }

    const bed = new this.bedModel({
      ...createBedDto,
      rent: bedRent, // Use calculated rent (from DTO or room default)
      tenantId,
    });

    const savedBed = await bed.save();
    const populatedBed = await savedBed.populate('roomId');
    return this.transformBedResponse(populatedBed);
  }

  async findAll(
    tenantId: string,
    filters?: {
      roomId?: string;
      status?: string;
      buildingId?: string;
      rentMin?: number;
      rentMax?: number;
      search?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.roomId) {
      query.roomId = filters.roomId;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.rentMin || filters?.rentMax) {
      query.rent = {}; // Bed rent is the source of truth
      if (filters.rentMin) {
        query.rent.$gte = filters.rentMin;
      }
      if (filters.rentMax) {
        query.rent.$lte = filters.rentMax;
      }
    }

    let beds = await this.bedModel.find(query).populate('roomId').exec();
    
    // Filter by building if specified
    if (filters?.buildingId) {
      beds = beds.filter((bed: any) => {
        const bedObj = bed.toObject ? bed.toObject() : bed;
        const room = bedObj.roomId as any;
        return room?.buildingId?.toString() === filters.buildingId;
      });
    }
    
    // Apply search filter (bed number)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      beds = beds.filter((bed: any) => {
        const bedObj = bed.toObject ? bed.toObject() : bed;
        return bedObj.bedNumber?.toLowerCase().includes(searchLower);
      });
    }
    
    return beds.map(this.transformBedResponse);
  }

  async findOne(id: string, tenantId: string) {
    const bed = await this.bedModel
      .findOne({ _id: id, tenantId })
      .populate('roomId')
      .exec();

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return this.transformBedResponse(bed);
  }

  async update(id: string, updateBedDto: UpdateBedDto, tenantId: string) {
    const bed = await this.bedModel
      .findOneAndUpdate({ _id: id, tenantId }, updateBedDto, { new: true })
      .populate('roomId')
      .exec();

    if (!bed) {
      throw new NotFoundException('Bed not found');
    }

    return this.transformBedResponse(bed);
  }

  async remove(id: string, tenantId: string) {
    const result = await this.bedModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();

    if (!result) {
      throw new NotFoundException('Bed not found');
    }
  }

  async getAvailableBeds(tenantId: string, roomId?: string) {
    const query: any = { tenantId, status: 'AVAILABLE' };
    if (roomId) {
      query.roomId = roomId;
    }

    return this.bedModel.find(query).populate('roomId').exec();
  }

  async getBedStats(tenantId: string) {
    const total = await this.bedModel.countDocuments({ tenantId });
    const available = await this.bedModel.countDocuments({
      tenantId,
      status: 'AVAILABLE',
    });
    const occupied = await this.bedModel.countDocuments({
      tenantId,
      status: 'OCCUPIED',
    });
    const maintenance = await this.bedModel.countDocuments({
      tenantId,
      status: 'MAINTENANCE',
    });

    return {
      total,
      available,
      occupied,
      maintenance,
      occupancyRate: total > 0 ? ((occupied / total) * 100).toFixed(1) : '0',
    };
  }
}

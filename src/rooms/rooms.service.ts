import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Room, RoomDocument } from './schemas/room.schema';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';

@Injectable()
export class RoomsService {
  constructor(@InjectModel(Room.name) private roomModel: Model<RoomDocument>) {}

  async create(createRoomDto: CreateRoomDto, tenantId: string) {
    // Check if room number already exists in tenant
    const existing = await this.roomModel.findOne({
      tenantId,
      roomNumber: createRoomDto.roomNumber,
    });
    if (existing) {
      throw new BadRequestException('Room number already exists');
    }

    const room = new this.roomModel({
      ...createRoomDto,
      tenantId,
    });
    return room.save();
  }

  async findAll(
    tenantId: string,
    filters?: {
      buildingId?: string;
      search?: string;
      capacityMin?: number;
      capacityMax?: number;
      occupiedMin?: number;
      occupiedMax?: number;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.buildingId) {
      query.buildingId = filters.buildingId;
    }
    if (filters?.capacityMin || filters?.capacityMax) {
      query.capacity = {};
      if (filters.capacityMin) {
        query.capacity.$gte = filters.capacityMin;
      }
      if (filters.capacityMax) {
        query.capacity.$lte = filters.capacityMax;
      }
    }
    if (filters?.occupiedMin || filters?.occupiedMax) {
      query.occupied = {};
      if (filters.occupiedMin) {
        query.occupied.$gte = filters.occupiedMin;
      }
      if (filters.occupiedMax) {
        query.occupied.$lte = filters.occupiedMax;
      }
    }
    
    let rooms = await this.roomModel.find(query).populate('buildingId').exec();
    
    // Apply search filter (room number)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      rooms = rooms.filter((room: any) => {
        const roomObj = room.toObject ? room.toObject() : room;
        return roomObj.roomNumber?.toLowerCase().includes(searchLower);
      });
    }
    // Transform to include buildingName
    return rooms.map((room: any) => {
      const roomObj = room.toObject ? room.toObject() : room;
      const building = roomObj.buildingId as any;
      return {
        ...roomObj,
        buildingName: building?.name || null,
        buildingId: building?._id || roomObj.buildingId,
      };
    });
  }

  async findOne(id: string, tenantId: string): Promise<any> {
    const room = await this.roomModel
      .findOne({ _id: id, tenantId })
      .populate('buildingId')
      .exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const roomObj = room.toObject ? room.toObject() : room;
    const building = roomObj.buildingId as any;
    return {
      ...roomObj,
      buildingName: building?.name || null,
      buildingId: building?._id || roomObj.buildingId,
    };
  }

  async update(id: string, updateRoomDto: UpdateRoomDto, tenantId: string): Promise<any> {
    const room = await this.roomModel
      .findOneAndUpdate({ _id: id, tenantId }, updateRoomDto, { new: true })
      .populate('buildingId')
      .exec();
    if (!room) {
      throw new NotFoundException('Room not found');
    }
    const roomObj = room.toObject ? room.toObject() : room;
    const building = roomObj.buildingId as any;
    return {
      ...roomObj,
      buildingName: building?.name || null,
      buildingId: building?._id || roomObj.buildingId,
    };
  }

  async remove(id: string, tenantId: string) {
    const result = await this.roomModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Room not found');
    }
  }
}

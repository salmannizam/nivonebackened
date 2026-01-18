import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Building, BuildingDocument } from './schemas/building.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
    @InjectModel(Room.name) private roomModel: Model<RoomDocument>,
  ) {}

  async create(createBuildingDto: CreateBuildingDto, tenantId: string) {
    const building = new this.buildingModel({
      ...createBuildingDto,
      tenantId,
    });
    return building.save();
  }

  async findAll(tenantId: string, filters?: { search?: string }) {
    const query: any = { tenantId };
    let buildings = await this.buildingModel.find(query).exec();
    
    // Apply search filter (name, address)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      buildings = buildings.filter((building: any) => {
        const buildingObj = building.toObject ? building.toObject() : building;
        return (
          buildingObj.name?.toLowerCase().includes(searchLower) ||
          buildingObj.address?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    // Count rooms for each building using aggregation for better performance and reliability
    const buildingIds = buildings.map((building: any) => {
      const buildingObj = building.toObject ? building.toObject() : building;
      return building._id || buildingObj._id;
    });
    
    // Aggregate room counts by buildingId
    const roomCounts = await this.roomModel.aggregate([
      {
        $match: {
          tenantId: tenantId,
          buildingId: { $in: buildingIds },
        },
      },
      {
        $group: {
          _id: '$buildingId',
          count: { $sum: 1 },
        },
      },
    ]).exec();
    
    // Create a map of buildingId to room count
    const roomCountMap = new Map(
      roomCounts.map((item: any) => [item._id.toString(), item.count])
    );
    
    // Add totalRooms to each building
    const buildingsWithRoomCount = buildings.map((building: any) => {
      const buildingObj = building.toObject ? building.toObject() : building;
      const buildingId = (building._id || buildingObj._id)?.toString();
      const roomCount = roomCountMap.get(buildingId) || 0;
      return {
        ...buildingObj,
        totalRooms: roomCount,
      };
    });
    
    return buildingsWithRoomCount;
  }

  async findOne(id: string, tenantId: string) {
    const building = await this.buildingModel
      .findOne({ _id: id, tenantId })
      .exec();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async update(id: string, updateBuildingDto: UpdateBuildingDto, tenantId: string) {
    const building = await this.buildingModel
      .findOneAndUpdate({ _id: id, tenantId }, updateBuildingDto, { new: true })
      .exec();
    if (!building) {
      throw new NotFoundException('Building not found');
    }
    return building;
  }

  async remove(id: string, tenantId: string) {
    const result = await this.buildingModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();
    if (!result) {
      throw new NotFoundException('Building not found');
    }
  }
}

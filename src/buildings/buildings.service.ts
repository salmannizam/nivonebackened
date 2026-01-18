import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
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
    
    // Count rooms for each building
    if (buildings.length === 0) {
      return [];
    }
    
    // Convert tenantId to ObjectId for proper matching
    const tenantObjectId = new Types.ObjectId(tenantId);
    
    // Count rooms for each building individually
    // This ensures proper type matching between building._id (ObjectId) and room.buildingId (ObjectId)
    const buildingsWithRoomCount = await Promise.all(
      buildings.map(async (building: any) => {
        const buildingObj = building.toObject ? building.toObject() : building;
        const buildingId = building._id; // This is already an ObjectId from Mongoose
        const buildingIdStr = buildingId.toString();
        
        // Try query with ObjectId first (correct way)
        let roomCount = await this.roomModel.countDocuments({
          tenantId: tenantObjectId,
          buildingId: buildingId,
        }).exec();
        
        // If no results, try with string format (fallback for data inconsistencies)
        if (roomCount === 0) {
          roomCount = await this.roomModel.countDocuments({
            $or: [
              { tenantId: tenantObjectId, buildingId: buildingId },
              { tenantId: tenantId, buildingId: buildingIdStr },
              { tenantId: tenantObjectId, buildingId: buildingIdStr },
            ],
          }).exec();
        }
        
        return {
          ...buildingObj,
          totalRooms: roomCount,
        };
      })
    );
    
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

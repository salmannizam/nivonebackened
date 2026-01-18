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
    // Convert tenantId to ObjectId for proper matching (tenantId is always a string from decorator)
    const tenantObjectId = new Types.ObjectId(tenantId);
    
    // Use Promise.all to count rooms for each building in parallel
    const buildingsWithRoomCount = await Promise.all(
      buildings.map(async (building: any) => {
        const buildingObj = building.toObject ? building.toObject() : building;
        // building._id is an ObjectId from Mongoose document
        const buildingId: any = building._id;
        
        // Count rooms for this building
        const roomCount = await this.roomModel.countDocuments({
          tenantId: tenantObjectId,
          buildingId: buildingId, // Mongoose will handle ObjectId matching
        }).exec();
        
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

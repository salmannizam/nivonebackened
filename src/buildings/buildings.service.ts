import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Building, BuildingDocument } from './schemas/building.schema';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';

@Injectable()
export class BuildingsService {
  constructor(
    @InjectModel(Building.name) private buildingModel: Model<BuildingDocument>,
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
    
    return buildings;
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

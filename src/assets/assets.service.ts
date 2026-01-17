import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Asset, AssetDocument } from './schemas/asset.schema';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { RoomDocument } from '../rooms/schemas/room.schema';

@Injectable()
export class AssetsService {
  constructor(
    @InjectModel(Asset.name) private assetModel: Model<AssetDocument>,
    @InjectModel('Room') private roomModel: Model<RoomDocument>,
  ) {}

  private transformAssetResponse(asset: AssetDocument): any {
    const assetObj = asset.toObject();
    const room = assetObj.roomId as unknown as RoomDocument;
    return {
      ...assetObj,
      roomNumber: room?.roomNumber || null,
      roomId: room?._id || assetObj.roomId,
    };
  }

  async create(createAssetDto: CreateAssetDto, tenantId: string) {
    // Verify room exists if roomId is provided
    if (createAssetDto.roomId) {
      const room = await this.roomModel.findOne({
        _id: createAssetDto.roomId,
        tenantId,
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }
    }

    const asset = new this.assetModel({
      ...createAssetDto,
      tenantId,
      status: createAssetDto.status || 'WORKING',
    });

    const savedAsset = await asset.save();
    if (savedAsset.roomId) {
      await savedAsset.populate('roomId');
    }
    return this.transformAssetResponse(savedAsset);
  }

  async findAll(
    tenantId: string,
    filters?: {
      roomId?: string;
      status?: string;
      category?: string;
      location?: string;
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
    if (filters?.category) {
      query.category = filters.category;
    }
    if (filters?.location) {
      query.location = { $regex: filters.location, $options: 'i' };
    }

    let assets = await this.assetModel.find(query).populate('roomId').exec();
    
    // Apply search filter (name, serialNumber, location)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      assets = assets.filter((a: any) => {
        const assetObj = a.toObject ? a.toObject() : a;
        return (
          assetObj.name?.toLowerCase().includes(searchLower) ||
          assetObj.serialNumber?.toLowerCase().includes(searchLower) ||
          assetObj.location?.toLowerCase().includes(searchLower)
        );
      });
    }
    
    return assets.map(this.transformAssetResponse);
  }

  async findOne(id: string, tenantId: string) {
    const asset = await this.assetModel
      .findOne({ _id: id, tenantId })
      .populate('roomId')
      .exec();

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.transformAssetResponse(asset);
  }

  async update(id: string, updateAssetDto: UpdateAssetDto, tenantId: string) {
    // Verify room exists if roomId is being updated
    if (updateAssetDto.roomId) {
      const room = await this.roomModel.findOne({
        _id: updateAssetDto.roomId,
        tenantId,
      });

      if (!room) {
        throw new NotFoundException('Room not found');
      }
    }

    const asset = await this.assetModel
      .findOneAndUpdate({ _id: id, tenantId }, updateAssetDto, { new: true })
      .populate('roomId')
      .exec();

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return this.transformAssetResponse(asset);
  }

  async remove(id: string, tenantId: string) {
    const result = await this.assetModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();

    if (!result) {
      throw new NotFoundException('Asset not found');
    }
  }

  async getMaintenanceDue(tenantId: string) {
    const now = new Date();
    return this.assetModel
      .find({
        tenantId,
        status: { $ne: 'DISPOSED' },
        $or: [
          { nextMaintenanceDate: { $lte: now } },
          { nextMaintenanceDate: { $exists: false } },
        ],
      })
      .populate('roomId')
      .exec();
  }

  async getStats(tenantId: string) {
    const total = await this.assetModel.countDocuments({ tenantId });
    const working = await this.assetModel.countDocuments({
      tenantId,
      status: 'WORKING',
    });
    const repair = await this.assetModel.countDocuments({
      tenantId,
      status: 'REPAIR',
    });
    const maintenanceDue = await this.assetModel.countDocuments({
      tenantId,
      nextMaintenanceDate: { $lte: new Date() },
      status: { $ne: 'DISPOSED' },
    });

    return {
      total,
      working,
      repair,
      maintenanceDue,
    };
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SavedFilter, SavedFilterDocument } from '../schemas/saved-filter.schema';

@Injectable()
export class SavedFilterService {
  constructor(
    @InjectModel(SavedFilter.name)
    private savedFilterModel: Model<SavedFilterDocument>,
  ) {}

  /**
   * Create a saved filter
   */
  async create(
    tenantId: string,
    userId: string,
    name: string,
    entityType: string,
    filters: Record<string, any>,
  ) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const userObjectId = typeof userId === 'string'
      ? new Types.ObjectId(userId)
      : userId;

    // Check if filter with same name already exists for this user and entity type
    const existing = await this.savedFilterModel.findOne({
      tenantId: tenantObjectId,
      userId: userObjectId,
      name,
      entityType,
      isActive: true,
    });

    if (existing) {
      throw new BadRequestException('A filter with this name already exists');
    }

    const savedFilter = new this.savedFilterModel({
      tenantId: tenantObjectId,
      userId: userObjectId,
      name,
      entityType,
      filters,
    });

    return savedFilter.save();
  }

  /**
   * Get all saved filters for a user
   */
  async findAll(
    tenantId: string,
    userId: string,
    entityType?: string,
  ) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const userObjectId = typeof userId === 'string'
      ? new Types.ObjectId(userId)
      : userId;

    const query: any = {
      tenantId: tenantObjectId,
      userId: userObjectId,
      isActive: true,
    };

    if (entityType) {
      query.entityType = entityType;
    }

    return this.savedFilterModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get saved filter by ID
   */
  async findOne(id: string, tenantId: string, userId: string) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const userObjectId = typeof userId === 'string'
      ? new Types.ObjectId(userId)
      : userId;

    const filter = await this.savedFilterModel
      .findOne({ _id: id, tenantId: tenantObjectId, userId: userObjectId })
      .exec();

    if (!filter) {
      throw new NotFoundException('Saved filter not found');
    }

    return filter;
  }

  /**
   * Update a saved filter
   */
  async update(
    id: string,
    tenantId: string,
    userId: string,
    updateData: {
      name?: string;
      filters?: Record<string, any>;
    },
  ) {
    const filter = await this.findOne(id, tenantId, userId);

    if (updateData.name && updateData.name !== filter.name) {
      // Check if new name conflicts with existing filter
      const existing = await this.savedFilterModel.findOne({
        tenantId: filter.tenantId,
        userId: filter.userId,
        name: updateData.name,
        entityType: filter.entityType,
        isActive: true,
        _id: { $ne: id },
      });

      if (existing) {
        throw new BadRequestException('A filter with this name already exists');
      }
    }

    Object.assign(filter, updateData);
    return filter.save();
  }

  /**
   * Delete (soft delete) a saved filter
   */
  async remove(id: string, tenantId: string, userId: string) {
    const filter = await this.findOne(id, tenantId, userId);
    filter.isActive = false;
    return filter.save();
  }
}

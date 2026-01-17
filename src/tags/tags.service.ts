import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tag, TagDocument } from '../common/schemas/tag.schema';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectModel(Tag.name) private tagModel: Model<TagDocument>,
  ) {}

  async create(tenantId: string, createTagDto: CreateTagDto): Promise<TagDocument> {
    // Check if tag with same name already exists for this tenant
    const existing = await this.tagModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      name: createTagDto.name.trim(),
    });

    if (existing) {
      throw new ConflictException(`Tag "${createTagDto.name}" already exists`);
    }

    const tag = new this.tagModel({
      tenantId: new Types.ObjectId(tenantId),
      name: createTagDto.name.trim(),
      color: createTagDto.color || this.generateDefaultColor(),
      category: createTagDto.category || 'General',
      isActive: true,
    });

    return tag.save();
  }

  async findAll(tenantId: string, includeInactive = false): Promise<TagDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (!includeInactive) {
      query.isActive = true;
    }
    return this.tagModel.find(query).sort({ name: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<TagDocument> {
    const tag = await this.tagModel.findOne({
      _id: id,
      tenantId: new Types.ObjectId(tenantId),
    }).exec();

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    return tag;
  }

  async update(tenantId: string, id: string, updateTagDto: UpdateTagDto): Promise<TagDocument> {
    const tag = await this.findOne(tenantId, id);

    // If updating name, check for conflicts
    if (updateTagDto.name && updateTagDto.name.trim() !== tag.name) {
      const existing = await this.tagModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: updateTagDto.name.trim(),
        _id: { $ne: id },
      });

      if (existing) {
        throw new ConflictException(`Tag "${updateTagDto.name}" already exists`);
      }
    }

    Object.assign(tag, {
      ...updateTagDto,
      name: updateTagDto.name ? updateTagDto.name.trim() : tag.name,
    });

    return tag.save();
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const tag = await this.findOne(tenantId, id);
    await this.tagModel.deleteOne({ _id: tag._id }).exec();
  }

  /**
   * Generate a default color for tags
   */
  private generateDefaultColor(): string {
    const colors = [
      '#3B82F6', // Blue
      '#10B981', // Green
      '#F59E0B', // Amber
      '#EF4444', // Red
      '#8B5CF6', // Purple
      '#EC4899', // Pink
      '#06B6D4', // Cyan
      '#84CC16', // Lime
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

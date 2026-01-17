import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PersonalNote, PersonalNoteDocument } from './schemas/personal-note.schema';
import { CreatePersonalNoteDto } from './dto/create-personal-note.dto';
import { UpdatePersonalNoteDto } from './dto/update-personal-note.dto';

@Injectable()
export class PersonalNotesService {
  private readonly MAX_PINNED_NOTES = 5;

  constructor(
    @InjectModel(PersonalNote.name) private personalNoteModel: Model<PersonalNoteDocument>,
  ) {}

  async create(userId: string, tenantId: string, createNoteDto: CreatePersonalNoteDto): Promise<PersonalNoteDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // If trying to pin, check if user already has max pinned notes
    if (createNoteDto.isPinned) {
      const pinnedCount = await this.personalNoteModel.countDocuments({
        userId: userObjectId,
        tenantId: tenantObjectId,
        isPinned: true,
      });

      if (pinnedCount >= this.MAX_PINNED_NOTES) {
        throw new BadRequestException(`Maximum ${this.MAX_PINNED_NOTES} pinned notes allowed`);
      }
    }

    const note = new this.personalNoteModel({
      userId: userObjectId,
      tenantId: tenantObjectId,
      content: createNoteDto.content.trim(),
      isPinned: createNoteDto.isPinned || false,
    });

    return note.save();
  }

  async findAll(userId: string, tenantId: string): Promise<PersonalNoteDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Return notes sorted by: pinned first, then by creation date (newest first)
    return this.personalNoteModel
      .find({
        userId: userObjectId,
        tenantId: tenantObjectId,
      })
      .sort({ isPinned: -1, createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, tenantId: string, id: string): Promise<PersonalNoteDocument> {
    const userObjectId = new Types.ObjectId(userId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    const note = await this.personalNoteModel.findOne({
      _id: id,
      userId: userObjectId,
      tenantId: tenantObjectId,
    }).exec();

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  async update(userId: string, tenantId: string, id: string, updateNoteDto: UpdatePersonalNoteDto): Promise<PersonalNoteDocument> {
    const note = await this.findOne(userId, tenantId, id);

    // If trying to pin, check if user already has max pinned notes (excluding current note)
    if (updateNoteDto.isPinned === true && !note.isPinned) {
      const pinnedCount = await this.personalNoteModel.countDocuments({
        userId: note.userId,
        tenantId: note.tenantId,
        isPinned: true,
        _id: { $ne: id },
      });

      if (pinnedCount >= this.MAX_PINNED_NOTES) {
        throw new BadRequestException(`Maximum ${this.MAX_PINNED_NOTES} pinned notes allowed`);
      }
    }

    if (updateNoteDto.content !== undefined) {
      note.content = updateNoteDto.content.trim();
    }
    if (updateNoteDto.isPinned !== undefined) {
      note.isPinned = updateNoteDto.isPinned;
    }

    return note.save();
  }

  async remove(userId: string, tenantId: string, id: string): Promise<void> {
    const note = await this.findOne(userId, tenantId, id);
    await this.personalNoteModel.deleteOne({ _id: note._id }).exec();
  }

  /**
   * Get count of pinned notes for a user
   */
  async getPinnedCount(userId: string, tenantId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    return this.personalNoteModel.countDocuments({
      userId: userObjectId,
      tenantId: tenantObjectId,
      isPinned: true,
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GatePass, GatePassDocument } from './schemas/gate-pass.schema';
import { CreateGatePassDto } from './dto/create-gate-pass.dto';
import { UpdateGatePassDto } from './dto/update-gate-pass.dto';
import { ResidentDocument } from '../residents/schemas/resident.schema';

@Injectable()
export class GatePassesService {
  constructor(
    @InjectModel(GatePass.name) private gatePassModel: Model<GatePassDocument>,
    @InjectModel('Resident') private residentModel: Model<ResidentDocument>,
  ) {}

  private transformGatePassResponse(gatePass: GatePassDocument): any {
    const gatePassObj = gatePass.toObject();
    const resident = gatePassObj.residentId as unknown as ResidentDocument;
    return {
      ...gatePassObj,
      residentName: resident?.name || null,
      residentId: resident?._id || gatePassObj.residentId,
    };
  }

  async create(createGatePassDto: CreateGatePassDto, tenantId: string) {
    // Verify resident exists
    const resident = await this.residentModel.findOne({
      _id: createGatePassDto.residentId,
      tenantId,
    });

    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    const gatePass = new this.gatePassModel({
      ...createGatePassDto,
      tenantId,
      status: 'OUT',
    });

    const savedGatePass = await gatePass.save();
    const populated = await savedGatePass.populate('residentId');
    return this.transformGatePassResponse(populated);
  }

  async findAll(
    tenantId: string,
    filters?: {
      residentId?: string;
      status?: string;
      date?: Date;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    },
  ) {
    const query: any = { tenantId };
    if (filters?.residentId) {
      query.residentId = filters.residentId;
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      query.exitTime = { $gte: startOfDay, $lte: endOfDay };
    } else if (filters?.dateFrom || filters?.dateTo) {
      query.exitTime = {};
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        query.exitTime.$gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        query.exitTime.$lte = to;
      }
    }

    const gatePasses = await this.gatePassModel
      .find(query)
      .populate('residentId')
      .sort({ exitTime: -1 })
      .exec();

    return gatePasses.map(this.transformGatePassResponse);
  }

  async findOne(id: string, tenantId: string) {
    const gatePass = await this.gatePassModel
      .findOne({ _id: id, tenantId })
      .populate('residentId')
      .exec();

    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    return this.transformGatePassResponse(gatePass);
  }

  async update(id: string, updateGatePassDto: UpdateGatePassDto, tenantId: string) {
    const updateData: any = { ...updateGatePassDto };

    // If actualReturnTime is set, update status
    if (updateGatePassDto.actualReturnTime) {
      updateData.status = 'RETURNED';
      // Check if overdue
      const gatePass = await this.gatePassModel.findOne({ _id: id, tenantId });
      if (gatePass && gatePass.expectedReturnTime) {
        if (updateGatePassDto.actualReturnTime > gatePass.expectedReturnTime) {
          updateData.status = 'OVERDUE';
        }
      }
    }

    const updated = await this.gatePassModel
      .findOneAndUpdate({ _id: id, tenantId }, updateData, { new: true })
      .populate('residentId')
      .exec();

    if (!updated) {
      throw new NotFoundException('Gate pass not found');
    }

    return this.transformGatePassResponse(updated);
  }

  async markReturn(id: string, tenantId: string) {
    const gatePass = await this.gatePassModel.findOne({ _id: id, tenantId });
    if (!gatePass) {
      throw new NotFoundException('Gate pass not found');
    }

    const actualReturnTime = new Date();
    let status = 'RETURNED';

    // Check if overdue
    if (gatePass.expectedReturnTime && actualReturnTime > gatePass.expectedReturnTime) {
      status = 'OVERDUE';
    }

    return this.update(id, { actualReturnTime, status } as any, tenantId);
  }

  async remove(id: string, tenantId: string) {
    const result = await this.gatePassModel
      .findOneAndDelete({ _id: id, tenantId })
      .exec();

    if (!result) {
      throw new NotFoundException('Gate pass not found');
    }
  }

  async getActivePasses(tenantId: string) {
    return this.gatePassModel
      .find({ tenantId, status: 'OUT' })
      .populate('residentId')
      .sort({ exitTime: -1 })
      .exec();
  }

  async getOverduePasses(tenantId: string) {
    const now = new Date();
    return this.gatePassModel
      .find({
        tenantId,
        status: 'OUT',
        expectedReturnTime: { $lt: now },
      })
      .populate('residentId')
      .sort({ expectedReturnTime: 1 })
      .exec();
  }
}

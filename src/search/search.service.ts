import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FeatureFlagService } from '../common/services/feature-flag.service';
import { FeatureKey } from '../common/schemas/feature-flag.schema';
import { Resident, ResidentDocument } from '../residents/schemas/resident.schema';
import { Room, RoomDocument } from '../rooms/schemas/room.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
};

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

@Injectable()
export class SearchService {
  constructor(
    @InjectModel(Resident.name)
    private readonly residentModel: Model<ResidentDocument>,
    @InjectModel(Room.name)
    private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  async search(query: string, tenantId: string, user: any) {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) {
      return this.emptyResult();
    }

    const tenantObjectId =
      typeof tenantId === 'string' ? new Types.ObjectId(tenantId) : tenantId;
    const userId = user?._id || user?.userId;

    const [canViewResidents, canViewRooms, canViewRentPayments, canViewExtraPayments] =
      await Promise.all([
        this.featureFlagService.isFeatureEnabledForUser(tenantId, userId, FeatureKey.RESIDENTS),
        this.featureFlagService.isFeatureEnabledForUser(tenantId, userId, FeatureKey.ROOMS),
        this.featureFlagService.isFeatureEnabledForUser(tenantId, userId, FeatureKey.RENT_PAYMENTS),
        this.featureFlagService.isFeatureEnabledForUser(tenantId, userId, FeatureKey.EXTRA_PAYMENTS),
      ]);

    const regexPattern = escapeRegExp(normalizedQuery);
    const [residents, rooms, payments] = await Promise.all([
      canViewResidents ? this.searchResidents(tenantObjectId, regexPattern) : [],
      canViewRooms ? this.searchRooms(tenantObjectId, regexPattern) : [],
      canViewRentPayments || canViewExtraPayments
        ? this.searchPayments(tenantObjectId, regexPattern, normalizedQuery)
        : [],
    ]);

    return {
      residents,
      rooms,
      payments,
    };
  }

  private emptyResult() {
    return {
      residents: [] as SearchResultItem[],
      rooms: [] as SearchResultItem[],
      payments: [] as SearchResultItem[],
    };
  }

  private async searchResidents(tenantId: Types.ObjectId, regexPattern: string) {
    const residents = await this.residentModel
      .find({
        tenantId,
        $or: [
          { name: { $regex: regexPattern, $options: 'i' } },
          { phone: { $regex: regexPattern, $options: 'i' } },
          { alternatePhone: { $regex: regexPattern, $options: 'i' } },
          { email: { $regex: regexPattern, $options: 'i' } },
        ],
      })
      .select('name phone email roomId')
      .populate('roomId', 'roomNumber')
      .limit(5)
      .lean();

    return residents.map((resident) => {
      const room = resident.roomId as any;
      const roomMeta = room?.roomNumber ? `Room ${room.roomNumber}` : undefined;
      return {
        id: resident._id.toString(),
        title: resident.name,
        subtitle: resident.phone,
        meta: roomMeta,
      };
    });
  }

  private async searchRooms(tenantId: Types.ObjectId, regexPattern: string) {
    const rooms = await this.roomModel
      .find({
        tenantId,
        roomNumber: { $regex: regexPattern, $options: 'i' },
      })
      .populate('buildingId', 'name')
      .limit(5)
      .lean();

    return rooms.map((room) => ({
      id: room._id.toString(),
      title: room.roomNumber,
      subtitle: (room.buildingId as any)?.name,
      meta: `Floor ${room.floor}`,
    }));
  }

  private async searchPayments(tenantId: Types.ObjectId, regexPattern: string, query: string) {
    const orConditions: any[] = [
      { transactionId: { $regex: regexPattern, $options: 'i' } },
      { notes: { $regex: regexPattern, $options: 'i' } },
    ];

    if (Types.ObjectId.isValid(query)) {
      orConditions.push({ _id: new Types.ObjectId(query) });
    }

    const payments = await this.paymentModel
      .find({
        tenantId,
        $or: orConditions,
      })
      .select('amount paymentType status transactionId createdAt')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return payments.map((payment) => ({
      id: payment._id.toString(),
      title: payment.transactionId
        ? `Txn ${payment.transactionId}`
        : payment._id.toString(),
      subtitle: `${payment.paymentType} • ₹${payment.amount?.toLocaleString('en-IN') ?? '0'}`,
      meta: payment.status,
    }));
  }
}

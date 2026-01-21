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
    try {
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

      // Create regex pattern for partial matching (escape special chars for security)
      const regexPattern = escapeRegExp(normalizedQuery);
      
      const [residents, rooms, payments] = await Promise.all([
        canViewResidents ? this.searchResidents(tenantObjectId, regexPattern) : [],
        canViewRooms ? this.searchRooms(tenantObjectId, regexPattern) : [],
        canViewRentPayments || canViewExtraPayments
          ? this.searchPayments(tenantObjectId, regexPattern, normalizedQuery, canViewRentPayments, canViewExtraPayments)
          : [],
      ]);

      return {
        residents,
        rooms,
        payments,
      };
    } catch (error) {
      // Log error and return empty results instead of crashing
      console.error('[SearchService] Error during search:', error);
      return this.emptyResult();
    }
  }

  private emptyResult() {
    return {
      residents: [] as SearchResultItem[],
      rooms: [] as SearchResultItem[],
      payments: [] as SearchResultItem[],
    };
  }

  private async searchResidents(tenantId: Types.ObjectId, regexPattern: string) {
    // Build the search query - MongoDB $regex handles null/undefined fields gracefully
    const searchQuery: any = {
      tenantId,
      archived: { $ne: true }, // Exclude archived residents
      $or: [
        { name: { $regex: regexPattern, $options: 'i' } },
        { phone: { $regex: regexPattern, $options: 'i' } },
        { alternatePhone: { $regex: regexPattern, $options: 'i' } },
        { email: { $regex: regexPattern, $options: 'i' } },
      ],
    };

    const residents = await this.residentModel
      .find(searchQuery)
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
    // Use aggregation to search by both room number and building name
    // IMPORTANT: Filter buildings by tenantId for security
    const rooms = await this.roomModel.aggregate([
      {
        $match: {
          tenantId,
        },
      },
      {
        $lookup: {
          from: 'buildings',
          let: { buildingId: '$buildingId', roomTenantId: '$tenantId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$_id', '$$buildingId'] },
                    { $eq: ['$tenantId', '$$roomTenantId'] }, // Security: ensure building belongs to same tenant
                  ],
                },
              },
            },
          ],
          as: 'building',
        },
      },
      {
        $unwind: {
          path: '$building',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          $or: [
            { roomNumber: { $regex: regexPattern, $options: 'i' } },
            { 'building.name': { $regex: regexPattern, $options: 'i' } },
          ],
        },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          _id: 1,
          roomNumber: 1,
          floor: 1,
          buildingName: '$building.name',
        },
      },
    ]);

    return rooms.map((room) => ({
      id: room._id.toString(),
      title: room.roomNumber,
      subtitle: room.buildingName || 'Unknown Building',
      meta: `Floor ${room.floor || 'N/A'}`,
    }));
  }

  private async searchPayments(
    tenantId: Types.ObjectId,
    regexPattern: string,
    query: string,
    canViewRentPayments: boolean,
    canViewExtraPayments: boolean,
  ) {
    const orConditions: any[] = [
      { transactionId: { $regex: regexPattern, $options: 'i' } },
      { notes: { $regex: regexPattern, $options: 'i' } },
    ];

    if (Types.ObjectId.isValid(query)) {
      orConditions.push({ _id: new Types.ObjectId(query) });
    }

    // Filter by payment type based on feature flags
    const paymentTypeFilter: any[] = [];
    if (canViewRentPayments) {
      paymentTypeFilter.push('RENT');
    }
    if (canViewExtraPayments) {
      paymentTypeFilter.push('EXTRA');
    }

    const queryConditions: any = {
      tenantId,
      $or: orConditions,
    };

    // Only filter by payment type if user doesn't have access to both
    if (paymentTypeFilter.length > 0 && paymentTypeFilter.length < 2) {
      queryConditions.paymentType = { $in: paymentTypeFilter };
    }

    const payments = await this.paymentModel
      .find(queryConditions)
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

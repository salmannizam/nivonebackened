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
      console.log('[SearchService] Search called with:', { query, normalizedQuery, tenantId, userId: user?._id || user?.userId });
      
      if (!normalizedQuery) {
        console.log('[SearchService] Empty query, returning empty results');
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

      console.log('[SearchService] Feature flags:', {
        canViewResidents,
        canViewRooms,
        canViewRentPayments,
        canViewExtraPayments,
      });

      // Create regex pattern for partial matching (escape special chars for security)
      const regexPattern = escapeRegExp(normalizedQuery);
      console.log('[SearchService] Regex pattern:', regexPattern);
      
      const [residents, rooms, payments] = await Promise.all([
        canViewResidents ? this.searchResidents(tenantObjectId, regexPattern) : [],
        canViewRooms ? this.searchRooms(tenantObjectId, regexPattern) : [],
        canViewRentPayments || canViewExtraPayments
          ? this.searchPayments(tenantObjectId, regexPattern, normalizedQuery, canViewRentPayments, canViewExtraPayments)
          : [],
      ]);

      console.log('[SearchService] Results:', {
        residentsCount: residents.length,
        roomsCount: rooms.length,
        paymentsCount: payments.length,
      });

      return {
        residents,
        rooms,
        payments,
      };
    } catch (error) {
      // Log error and return empty results instead of crashing
      console.error('[SearchService] Error during search:', error);
      console.error('[SearchService] Error stack:', error.stack);
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
    try {
      // First, check if we have any residents for this tenant
      const totalResidents = await this.residentModel.countDocuments({
        tenantId,
        archived: { $ne: true },
      });
      console.log('[SearchResidents] Total residents for tenant:', totalResidents);

      // Build the search query - MongoDB $regex handles null/undefined fields gracefully
      // archived: { $ne: true } matches false, null, and undefined (all non-archived)
      const searchQuery: any = {
        tenantId,
        archived: { $ne: true }, // Exclude archived residents (matches false, null, undefined)
        $or: [
          { name: { $regex: regexPattern, $options: 'i' } },
          { phone: { $regex: regexPattern, $options: 'i' } },
          { alternatePhone: { $regex: regexPattern, $options: 'i' } },
          { email: { $regex: regexPattern, $options: 'i' } },
        ],
      };

      console.log('[SearchResidents] Query:', JSON.stringify(searchQuery, null, 2));
      console.log('[SearchResidents] TenantId type:', typeof tenantId, 'Value:', tenantId.toString());

      const residents = await this.residentModel
        .find(searchQuery)
        .select('name phone email roomId')
        .populate('roomId', 'roomNumber')
        .limit(5)
        .lean();
      
      console.log('[SearchResidents] Found:', residents.length, 'residents');
      if (residents.length > 0) {
        console.log('[SearchResidents] First resident:', {
          name: residents[0].name,
          phone: residents[0].phone,
          email: residents[0].email,
        });
      } else if (totalResidents > 0) {
        // If we have residents but search returned nothing, try a simpler query
        console.log('[SearchResidents] Trying simpler query without regex...');
        const testResidents = await this.residentModel
          .find({ tenantId, archived: { $ne: true } })
          .select('name phone email')
          .limit(2)
          .lean();
        console.log('[SearchResidents] Test query found:', testResidents.length, 'Sample names:', testResidents.map((r: any) => r.name));
      }

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
    } catch (error) {
      console.error('[SearchResidents] Error:', error);
      throw error;
    }
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

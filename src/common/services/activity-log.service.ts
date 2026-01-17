import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog, ActivityLogDocument } from '../schemas/activity-log.schema';

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectModel(ActivityLog.name)
    private activityLogModel: Model<ActivityLogDocument>,
  ) {}

  /**
   * Create an activity log entry
   */
  async create(
    tenantId: string,
    eventType: string,
    message: string,
    performedBy: string,
    options?: {
      entityType?: string;
      entityId?: string;
      performedByRole?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;
    const performedByObjectId = typeof performedBy === 'string'
      ? new Types.ObjectId(performedBy)
      : performedBy;

    const activityLog = new this.activityLogModel({
      tenantId: tenantObjectId,
      eventType,
      message,
      performedBy: performedByObjectId,
      entityType: options?.entityType,
      entityId: options?.entityId ? new Types.ObjectId(options.entityId) : undefined,
      performedByRole: options?.performedByRole,
      metadata: options?.metadata,
    });

    return activityLog.save();
  }

  /**
   * Get activity logs for a tenant
   * Visible to all roles (unlike audit logs which are OWNER-only)
   */
  async findAll(
    tenantId: string,
    filters?: {
      eventType?: string;
      entityType?: string;
      entityId?: string;
      performedBy?: string;
      days?: number; // Last N days (default: 30)
      limit?: number;
      skip?: number;
    },
  ) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    const query: any = { tenantId: tenantObjectId };

    if (filters?.eventType) {
      query.eventType = filters.eventType;
    }
    if (filters?.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      query.entityId = typeof filters.entityId === 'string'
        ? new Types.ObjectId(filters.entityId)
        : filters.entityId;
    }
    if (filters?.performedBy) {
      query.performedBy = typeof filters.performedBy === 'string'
        ? new Types.ObjectId(filters.performedBy)
        : filters.performedBy;
    }

    // Filter by last N days (default: 30)
    const days = filters?.days || 30;
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);
    query.createdAt = { $gte: dateFrom };

    const limit = filters?.limit || 100;
    const skip = filters?.skip || 0;

    return this.activityLogModel
      .find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get activity log by ID
   */
  async findOne(id: string, tenantId: string) {
    const tenantObjectId = typeof tenantId === 'string'
      ? new Types.ObjectId(tenantId)
      : tenantId;

    return this.activityLogModel
      .findOne({ _id: id, tenantId: tenantObjectId })
      .populate('performedBy', 'name email role')
      .exec();
  }

  /**
   * Get recent activities for dashboard (last 10)
   */
  async getRecentActivities(tenantId: string, limit: number = 10) {
    return this.findAll(tenantId, { days: 7, limit });
  }
}

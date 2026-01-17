import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from '../schemas/audit-log.schema';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  /**
   * Create an audit log entry
   */
  async create(
    tenantId: string,
    action: string,
    performedBy: string,
    options?: {
      entityType?: string;
      entityId?: string;
      oldValue?: any;
      newValue?: any;
      description?: string;
      ipAddress?: string;
      userAgent?: string;
    },
  ) {
    const auditLog = new this.auditLogModel({
      tenantId,
      action,
      performedBy,
      entityType: options?.entityType,
      entityId: options?.entityId,
      oldValue: options?.oldValue,
      newValue: options?.newValue,
      description: options?.description,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
    });

    return auditLog.save();
  }

  /**
   * Get audit logs for a tenant
   * Only accessible by OWNER role
   */
  async findAll(
    tenantId: string,
    filters?: {
      action?: string;
      entityType?: string;
      entityId?: string;
      performedBy?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      skip?: number;
    },
  ) {
    const query: any = { tenantId };

    if (filters?.action) {
      query.action = filters.action;
    }
    if (filters?.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters?.entityId) {
      query.entityId = filters.entityId;
    }
    if (filters?.performedBy) {
      query.performedBy = filters.performedBy;
    }
    if (filters?.dateFrom || filters?.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) {
        query.createdAt.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.createdAt.$lte = filters.dateTo;
      }
    }

    const limit = filters?.limit || 100;
    const skip = filters?.skip || 0;

    return this.auditLogModel
      .find(query)
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  /**
   * Get audit log by ID
   */
  async findOne(id: string, tenantId: string) {
    return this.auditLogModel
      .findOne({ _id: id, tenantId })
      .populate('performedBy', 'name email')
      .exec();
  }
}

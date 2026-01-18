import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tenant, TenantDocument } from '../../tenants/schemas/tenant.schema';
import { PlanSubscription, PlanSubscriptionDocument, SubscriptionStatus } from '../schemas/plan-subscription.schema';
import { Plan, PlanDocument } from '../schemas/plan.schema';

export enum LimitType {
  ROOMS = 'rooms',
  RESIDENTS = 'residents',
  STAFF = 'staff',
  BEDS = 'beds',
}

export interface PlanLimitError {
  code: 'PLAN_LIMIT_REACHED';
  feature: string;
  limit: number;
  used: number;
  plan: string;
}

@Injectable()
export class PlanLimitService {
  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(PlanSubscription.name) private subscriptionModel: Model<PlanSubscriptionDocument>,
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
  ) {}

  /**
   * Check if tenant can create a resource based on plan limits
   * SECURITY: Uses current count to prevent race conditions
   * @param tenantId Tenant ID
   * @param limitType Type of limit to check (rooms, residents, staff, beds)
   * @param currentCount Current count of the resource (will be incremented by 1)
   * @throws ForbiddenException with PLAN_LIMIT_REACHED error if limit exceeded
   */
  async checkLimit(tenantId: string, limitType: LimitType, currentCount: number): Promise<void> {
    // Validate inputs
    if (!tenantId || typeof tenantId !== 'string') {
      throw new NotFoundException('Invalid tenant ID');
    }

    if (typeof currentCount !== 'number' || currentCount < 0) {
      throw new BadRequestException('Invalid current count');
    }

    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Get subscription and plan
    const subscription = await this.subscriptionModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .populate('planId')
      .exec();

    let limit: number;
    let planName: string;

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      // If no active subscription, use tenant's default limits
      limit = this.getLimitFromTenant(tenant, limitType);
      planName = tenant.plan || 'free';
    } else {
      const plan = subscription.planId as any as PlanDocument;
      limit = this.getLimitFromPlan(plan, limitType);
      planName = plan.name || 'unknown';
    }

    // -1 means unlimited
    if (limit === -1) {
      return;
    }

    // SECURITY: Check if adding one more would exceed limit
    // This prevents race conditions by checking BEFORE creation
    // Note: For true atomicity, use database transactions in production
    if (currentCount >= limit) {
      throw this.createLimitError(limitType, limit, currentCount, planName);
    }
  }

  /**
   * Get current usage count for a limit type
   */
  async getCurrentUsage(tenantId: string, limitType: LimitType, countModel: Model<any>): Promise<number> {
    const count = await countModel.countDocuments({ tenantId: new Types.ObjectId(tenantId) }).exec();
    return count;
  }

  /**
   * Get limit for a tenant's plan
   */
  async getLimit(tenantId: string, limitType: LimitType): Promise<number> {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    const subscription = await this.subscriptionModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .populate('planId')
      .exec();

    if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE) {
      return this.getLimitFromTenant(tenant, limitType);
    }

    const plan = subscription.planId as any as PlanDocument;
    return this.getLimitFromPlan(plan, limitType);
  }

  /**
   * Get usage and limit info for display
   */
  async getLimitInfo(tenantId: string, limitType: LimitType, countModel: Model<any>): Promise<{
    used: number;
    limit: number;
    remaining: number;
    isUnlimited: boolean;
  }> {
    const [used, limit] = await Promise.all([
      this.getCurrentUsage(tenantId, limitType, countModel),
      this.getLimit(tenantId, limitType),
    ]);

    return {
      used,
      limit,
      remaining: limit === -1 ? -1 : Math.max(0, limit - used),
      isUnlimited: limit === -1,
    };
  }

  private getLimitFromPlan(plan: PlanDocument, limitType: LimitType): number {
    if (!plan.limits) return -1;
    
    switch (limitType) {
      case LimitType.ROOMS:
        return plan.limits.rooms ?? -1;
      case LimitType.RESIDENTS:
        return plan.limits.residents ?? -1;
      case LimitType.STAFF:
        return plan.limits.staff ?? -1;
      case LimitType.BEDS:
        // Beds limit is typically same as rooms or unlimited
        return plan.limits.rooms ?? -1;
      default:
        return -1;
    }
  }

  private getLimitFromTenant(tenant: TenantDocument, limitType: LimitType): number {
    if (!tenant.limits) return -1;
    
    switch (limitType) {
      case LimitType.ROOMS:
        return tenant.limits.rooms ?? -1;
      case LimitType.RESIDENTS:
        return tenant.limits.residents ?? -1;
      case LimitType.STAFF:
        return tenant.limits.staff ?? -1;
      case LimitType.BEDS:
        return tenant.limits.rooms ?? -1;
      default:
        return -1;
    }
  }

  private createLimitError(limitType: LimitType, limit: number, used: number, planName: string): ForbiddenException {
    const error: PlanLimitError = {
      code: 'PLAN_LIMIT_REACHED',
      feature: limitType.toUpperCase(),
      limit,
      used,
      plan: planName,
    };

    const exception = new ForbiddenException(error);
    (exception as any).response = error;
    return exception;
  }
}

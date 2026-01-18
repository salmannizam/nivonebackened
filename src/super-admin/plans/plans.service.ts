import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan, PlanDocument } from '../../common/schemas/plan.schema';
import { PlanSubscription, PlanSubscriptionDocument, SubscriptionStatus } from '../../common/schemas/plan-subscription.schema';
import { BillingCycle } from '../../common/schemas/plan.schema';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { AssignPlanDto } from './dto/assign-plan.dto';
import { TenantsService } from '../../tenants/tenants.service';
import { FeatureFlagService } from '../../common/services/feature-flag.service';
import { FeatureKey } from '../../common/schemas/feature-flag.schema';

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    @InjectModel(PlanSubscription.name) private subscriptionModel: Model<PlanSubscriptionDocument>,
    private tenantsService: TenantsService,
    private featureFlagService: FeatureFlagService,
  ) {}

  async create(createPlanDto: CreatePlanDto): Promise<PlanDocument> {
    const plan = new this.planModel(createPlanDto);
    return plan.save();
  }

  async findAll(activeOnly?: boolean): Promise<any[]> {
    const query = activeOnly ? { isActive: true } : {};
    const plans = await this.planModel.find(query).sort({ price: 1 }).exec();
    
    // Get tenant count for each plan
    const plansWithCounts = await Promise.all(
      plans.map(async (plan) => {
        const count = await this.subscriptionModel.countDocuments({
          planId: plan._id,
        }).exec();
        return {
          ...plan.toObject(),
          tenantCount: count,
        };
      }),
    );
    
    return plansWithCounts;
  }

  async findOne(id: string): Promise<PlanDocument> {
    const plan = await this.planModel.findById(id).exec();
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async findBySlug(slug: string): Promise<PlanDocument | null> {
    return this.planModel.findOne({ slug, isActive: true }).exec();
  }

  /**
   * Find default plan for new tenant signups
   * Returns the lowest price active plan, or 'free' plan if exists
   */
  async findDefaultPlan(): Promise<PlanDocument | null> {
    // First try to find a plan with slug 'free'
    const freePlan = await this.planModel.findOne({ slug: 'free', isActive: true }).exec();
    if (freePlan) {
      return freePlan;
    }

    // Otherwise, return the lowest price active plan
    const defaultPlan = await this.planModel
      .findOne({ isActive: true })
      .sort({ price: 1 })
      .exec();

    return defaultPlan;
  }

  async update(id: string, updatePlanDto: UpdatePlanDto): Promise<PlanDocument> {
    const plan = await this.planModel.findByIdAndUpdate(id, updatePlanDto, { new: true }).exec();
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    
    // If features were updated, sync to all tenants using this plan
    if (updatePlanDto.features !== undefined) {
      const subscriptions = await this.subscriptionModel.find({
        planId: new Types.ObjectId(id),
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      }).exec();
      
      for (const subscription of subscriptions) {
        const tenantId = subscription.tenantId.toString();
        
        // Disable all features first
        const allFeatures = Object.values(FeatureKey);
        for (const featureKey of allFeatures) {
          await this.featureFlagService.setTenantFeature(tenantId, featureKey, false);
        }
        
        // Enable only features included in the updated plan
        if (Array.isArray(plan.features)) {
          for (const featureKey of plan.features) {
            if (Object.values(FeatureKey).includes(featureKey as FeatureKey)) {
              await this.featureFlagService.setTenantFeature(tenantId, featureKey as FeatureKey, true);
            }
          }
        }
      }
    }
    
    return plan;
  }

  async remove(id: string): Promise<void> {
    // Check if plan is assigned to any tenant
    const subscriptions = await this.subscriptionModel.find({ planId: new Types.ObjectId(id) }).exec();
    if (subscriptions.length > 0) {
      // Deactivate instead of delete (per spec: "Deleting a plan is NOT allowed → only deactivate")
      const plan = await this.planModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
      if (!plan) {
        throw new NotFoundException('Plan not found');
      }
      return;
    }
    const result = await this.planModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Plan not found');
    }
  }

  async assignPlanToTenant(tenantId: string, assignPlanDto: AssignPlanDto): Promise<PlanSubscriptionDocument> {
    const plan = await this.findOne(assignPlanDto.planId);
    const tenant = await this.tenantsService.findOne(tenantId);

    // Check if tenant already has an active subscription
    const existingSubscription = await this.subscriptionModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
    }).exec();

    if (existingSubscription) {
      throw new BadRequestException('Tenant already has an active subscription');
    }

    const startDate = assignPlanDto.startDate ? new Date(assignPlanDto.startDate) : new Date();
    const nextBillingDate = this.calculateNextBillingDate(startDate, plan.billingCycle);

    // Update tenant plan and limits
    await this.tenantsService.update(tenantId, {
      plan: plan.slug,
      limits: {
        rooms: plan.limits?.rooms ?? -1,
        residents: plan.limits?.residents ?? -1,
        staff: plan.limits?.staff ?? -1,
      },
    });

    // Sync plan features to tenant feature flags
    if (plan.features && Array.isArray(plan.features)) {
      // Disable all features first
      const allFeatures = Object.values(FeatureKey);
      for (const featureKey of allFeatures) {
        await this.featureFlagService.setTenantFeature(tenantId, featureKey, false);
      }
      
      // Enable only features included in the plan
      for (const featureKey of plan.features) {
        if (Object.values(FeatureKey).includes(featureKey as FeatureKey)) {
          await this.featureFlagService.setTenantFeature(tenantId, featureKey as FeatureKey, true);
        }
      }
    }

    // Determine initial status
    let initialStatus = SubscriptionStatus.ACTIVE;
    if (assignPlanDto.trialEndDate) {
      initialStatus = SubscriptionStatus.TRIAL;
    } else if (plan.price === 0) {
      initialStatus = SubscriptionStatus.PAID; // Free plan is automatically paid
    }

    // Create subscription
    const subscription = new this.subscriptionModel({
      tenantId: new Types.ObjectId(tenantId),
      planId: new Types.ObjectId(assignPlanDto.planId),
      status: initialStatus,
      startDate,
      endDate: assignPlanDto.trialEndDate ? new Date(assignPlanDto.trialEndDate) : undefined,
      nextBillingDate,
      amount: plan.price,
      billingCycle: plan.billingCycle,
      isPaid: plan.price === 0, // Free plans are automatically paid
    });

    return subscription.save();
  }

  async getTenantSubscription(tenantId: string): Promise<PlanSubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .populate('planId')
      .exec();
  }

  async getSubscriptionsDue(upcomingDays: number = 7): Promise<PlanSubscriptionDocument[]> {
    const today = new Date();
    const dueDate = new Date();
    dueDate.setDate(today.getDate() + upcomingDays);

    // Get subscriptions that are due (billing date passed and unpaid)
    const dueSubscriptions = await this.subscriptionModel
      .find({
        status: { $in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.DUE] },
        nextBillingDate: { $lte: dueDate },
        isPaid: false,
      })
      .populate('tenantId', 'name slug')
      .populate('planId', 'name price billingCycle')
      .sort({ nextBillingDate: 1 })
      .exec();

    // Update status to DUE for overdue subscriptions
    for (const sub of dueSubscriptions) {
      if (sub.nextBillingDate <= today && sub.status === SubscriptionStatus.ACTIVE) {
        sub.status = SubscriptionStatus.DUE;
        await sub.save();
      }
    }

    return dueSubscriptions;
  }

  async getAllSubscriptions(status?: string): Promise<PlanSubscriptionDocument[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    return this.subscriptionModel
      .find(query)
      .populate('tenantId', 'name slug')
      .populate('planId', 'name price billingCycle features')
      .sort({ createdAt: -1 })
      .exec();
  }

  async markSubscriptionPaid(tenantId: string, amount: number): Promise<PlanSubscriptionDocument> {
    const subscription = await this.subscriptionModel
      .findOne({ tenantId: new Types.ObjectId(tenantId) })
      .populate('planId')
      .exec();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    const plan = subscription.planId as any;
    const nextBillingDate = this.calculateNextBillingDate(subscription.nextBillingDate, plan.billingCycle);

    subscription.isPaid = true;
    subscription.lastPaymentDate = new Date();
    subscription.lastPaymentAmount = amount;
    subscription.nextBillingDate = nextBillingDate;

    return subscription.save();
  }

  private calculateNextBillingDate(startDate: Date, billingCycle: BillingCycle): Date {
    const nextDate = new Date(startDate);
    
    switch (billingCycle) {
      case BillingCycle.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case BillingCycle.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  async getPlanStats(): Promise<any> {
    const plans = await this.findAll();
    const subscriptions = await this.subscriptionModel.find().populate('planId').exec();

    const stats = plans.map((plan) => {
      const planSubscriptions = subscriptions.filter(
        (sub) => (sub.planId as any)?._id?.toString() === plan._id.toString(),
      );
      const activeSubscriptions = planSubscriptions.filter(
        (sub) => sub.status === SubscriptionStatus.ACTIVE,
      );

      return {
        planId: plan._id,
        planName: plan.name,
        totalSubscriptions: planSubscriptions.length,
        activeSubscriptions: activeSubscriptions.length,
        monthlyRevenue: activeSubscriptions.reduce((sum, sub) => {
          const cycle = (sub.planId as any)?.billingCycle;
          if (cycle === BillingCycle.MONTHLY) return sum + (sub.planId as any)?.price;
          if (cycle === BillingCycle.YEARLY) return sum + (sub.planId as any)?.price / 12;
          return sum;
        }, 0),
      };
    });

    return stats;
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Feature, FeatureDocument, FeatureCategory } from '../../common/schemas/feature.schema';
import { FeatureKey } from '../../common/schemas/feature-flag.schema';

@Injectable()
export class FeaturesService {
  constructor(
    @InjectModel(Feature.name) private featureModel: Model<FeatureDocument>,
  ) {}

  async create(createFeatureDto: {
    name: string;
    key: FeatureKey;
    category: FeatureCategory;
    description: string;
    isActive?: boolean;
  }): Promise<FeatureDocument> {
    // Check if key already exists
    const existing = await this.featureModel.findOne({ key: createFeatureDto.key }).exec();
    if (existing) {
      throw new BadRequestException(`Feature with key ${createFeatureDto.key} already exists`);
    }

    const feature = new this.featureModel(createFeatureDto);
    return feature.save();
  }

  async findAll(activeOnly?: boolean): Promise<FeatureDocument[]> {
    const query = activeOnly ? { isActive: true } : {};
    return this.featureModel.find(query).sort({ category: 1, name: 1 }).exec();
  }

  async findByCategory(category: FeatureCategory): Promise<FeatureDocument[]> {
    return this.featureModel.find({ category, isActive: true }).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<FeatureDocument> {
    const feature = await this.featureModel.findById(id).exec();
    if (!feature) {
      throw new NotFoundException('Feature not found');
    }
    return feature;
  }

  async findByKey(key: FeatureKey): Promise<FeatureDocument | null> {
    return this.featureModel.findOne({ key }).exec();
  }

  async update(id: string, updateDto: Partial<{
    name: string;
    description: string;
    category: FeatureCategory;
    isActive: boolean;
  }>): Promise<FeatureDocument> {
    const feature = await this.featureModel.findByIdAndUpdate(id, updateDto, { new: true }).exec();
    if (!feature) {
      throw new NotFoundException('Feature not found');
    }
    return feature;
  }

  async remove(id: string): Promise<void> {
    const result = await this.featureModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('Feature not found');
    }
  }

  async seedDefaultFeatures(): Promise<void> {
    const defaultFeatures = [
      // Core
      { name: 'Buildings', key: FeatureKey.BUILDINGS, category: FeatureCategory.CORE, description: 'Manage buildings and properties' },
      { name: 'Rooms', key: FeatureKey.ROOMS, category: FeatureCategory.CORE, description: 'Manage rooms within buildings' },
      { name: 'Beds', key: FeatureKey.BEDS, category: FeatureCategory.CORE, description: 'Manage beds and bed assignments' },
      { name: 'Residents', key: FeatureKey.RESIDENTS, category: FeatureCategory.CORE, description: 'Manage resident information and check-ins' },
      
      // Payments
      { name: 'Rent Payments', key: FeatureKey.RENT_PAYMENTS, category: FeatureCategory.PAYMENTS, description: 'Track and manage rent payments' },
      { name: 'Extra Payments', key: FeatureKey.EXTRA_PAYMENTS, category: FeatureCategory.PAYMENTS, description: 'Handle additional payments beyond rent' },
      { name: 'Security Deposits', key: FeatureKey.SECURITY_DEPOSITS, category: FeatureCategory.PAYMENTS, description: 'Manage security deposit collection and refunds' },
      { name: 'Online Payments', key: FeatureKey.ONLINE_PAYMENTS, category: FeatureCategory.PAYMENTS, description: 'Enable online payment processing', isActive: false },
      
      // Operations
      { name: 'Complaints', key: FeatureKey.COMPLAINTS, category: FeatureCategory.OPERATIONS, description: 'Manage resident complaints and resolutions' },
      { name: 'Visitors', key: FeatureKey.VISITORS, category: FeatureCategory.OPERATIONS, description: 'Track visitor entries and exits' },
      { name: 'Gate Passes', key: FeatureKey.GATE_PASSES, category: FeatureCategory.OPERATIONS, description: 'Issue and manage gate passes' },
      { name: 'Notices', key: FeatureKey.NOTICES, category: FeatureCategory.OPERATIONS, description: 'Create and manage notices for residents' },
      
      // Management
      { name: 'Staff', key: FeatureKey.STAFF, category: FeatureCategory.MANAGEMENT, description: 'Manage staff members and their roles' },
      { name: 'Assets', key: FeatureKey.ASSETS, category: FeatureCategory.MANAGEMENT, description: 'Track and manage assets' },
      { name: 'User Management', key: FeatureKey.USER_MANAGEMENT, category: FeatureCategory.MANAGEMENT, description: 'Create and manage users within the tenant' },
      { name: 'Settings', key: FeatureKey.SETTINGS, category: FeatureCategory.MANAGEMENT, description: 'Access tenant settings and configuration' },
      
      // Analytics
      { name: 'Reports', key: FeatureKey.REPORTS, category: FeatureCategory.ANALYTICS, description: 'Generate and view reports' },
      { name: 'Insights', key: FeatureKey.INSIGHTS, category: FeatureCategory.ANALYTICS, description: 'View analytics and insights dashboard' },
      { name: 'Export Data', key: FeatureKey.EXPORT_DATA, category: FeatureCategory.ANALYTICS, description: 'Export data in various formats' },
      
      // Advanced
      { name: 'Activity Log', key: FeatureKey.ACTIVITY_LOG, category: FeatureCategory.ADVANCED, description: 'View activity timeline and audit feed' },
      { name: 'Audit Log', key: FeatureKey.AUDIT_LOG, category: FeatureCategory.ADVANCED, description: 'View detailed audit logs' },
      { name: 'Saved Filters', key: FeatureKey.SAVED_FILTERS, category: FeatureCategory.ADVANCED, description: 'Save and reuse filtered views' },
      { name: 'Custom Tags', key: FeatureKey.CUSTOM_TAGS, category: FeatureCategory.ADVANCED, description: 'Add custom tags to residents and payments' },
      { name: 'Bulk Actions', key: FeatureKey.BULK_ACTIONS, category: FeatureCategory.ADVANCED, description: 'Perform bulk operations on multiple records' },
      { name: 'Proration', key: FeatureKey.PRORATION, category: FeatureCategory.ADVANCED, description: 'Automatic prorated rent calculation for mid-month moves' },
      { name: 'Personal Notes', key: FeatureKey.PERSONAL_NOTES, category: FeatureCategory.ADVANCED, description: 'Private notepad and reminders for personal use' },
      
      // Notifications
      { name: 'Email Notifications', key: FeatureKey.NOTIFICATIONS_EMAIL, category: FeatureCategory.ADVANCED, description: 'Send email notifications for system events', isActive: false },
      { name: 'SMS Notifications', key: FeatureKey.NOTIFICATIONS_SMS, category: FeatureCategory.ADVANCED, description: 'Send SMS notifications for system events', isActive: false },
    ];

    for (const featureData of defaultFeatures) {
      const existing = await this.featureModel.findOne({ key: featureData.key }).exec();
      if (!existing) {
        // Create new feature
        await this.featureModel.create(featureData);
      } else {
        // Update existing feature (in case name, description, or category changed)
        await this.featureModel.findOneAndUpdate(
          { key: featureData.key },
          {
            name: featureData.name,
            description: featureData.description,
            category: featureData.category,
            // Don't override isActive if it was manually set to false
            ...(featureData.isActive !== undefined && { isActive: featureData.isActive }),
          },
          { new: true }
        ).exec();
      }
    }
  }
}

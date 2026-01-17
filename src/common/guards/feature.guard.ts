import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FEATURE_KEY } from '../decorators/feature.decorator';
import { FeatureKey } from '../schemas/feature-flag.schema';
import { FeatureFlagService } from '../services/feature-flag.service';
import { RequestWithUser } from '../interfaces/request.interface';

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check handler first (method-level decorator)
    const handlerFeatures = this.reflector.get<FeatureKey[]>(
      FEATURE_KEY,
      context.getHandler(),
    );
    
    // Check class (class-level decorator)
    const classFeatures = this.reflector.get<FeatureKey[]>(
      FEATURE_KEY,
      context.getClass(),
    );
    
    // If handler has explicit decorator (even if empty array), use that
    // Otherwise, use class-level features
    const requiredFeatures = handlerFeatures !== undefined 
      ? handlerFeatures 
      : classFeatures;

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, tenantId } = request;

    if (!user || !tenantId) {
      throw new ForbiddenException('User or tenant not found');
    }

    // Check each required feature
    for (const feature of requiredFeatures) {
      const enabled = await this.featureFlagService.isFeatureEnabledForUser(
        tenantId,
        user._id || user.id,
        feature,
      );

      if (!enabled) {
        throw new ForbiddenException(`Feature ${feature} is not enabled`);
      }
    }

    return true;
  }
}

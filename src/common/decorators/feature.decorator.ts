import { SetMetadata } from '@nestjs/common';
import { FeatureKey } from '../schemas/feature-flag.schema';

export const FEATURE_KEY = 'feature';
export const Features = (...features: FeatureKey[]) => SetMetadata(FEATURE_KEY, features);

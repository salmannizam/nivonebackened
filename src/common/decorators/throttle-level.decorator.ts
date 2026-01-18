import { SetMetadata } from '@nestjs/common';
import { ThrottleLevel as ThrottleLevelEnum } from '../enums/throttle-level.enum';

export const THROTTLE_LEVEL_KEY = 'throttleLevel';

/**
 * Decorator to set throttle level for an endpoint
 * @param level - Throttle level (LOW, MID, HIGH, MODERATE)
 * 
 * @example
 * @ThrottleLevel(ThrottleLevel.LOW) // Allow more requests
 * @Get()
 * findAll() { ... }
 */
export const ThrottleLevel = (level: ThrottleLevelEnum) => SetMetadata(THROTTLE_LEVEL_KEY, level);

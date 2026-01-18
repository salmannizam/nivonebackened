# Throttler Module Usage Guide

## Overview

The throttler module provides rate limiting for all API endpoints with configurable levels:
- **LOW**: 100 requests per minute (for high-traffic endpoints like login, signup)
- **MID**: 60 requests per minute (default for all endpoints)
- **MODERATE**: 45 requests per minute
- **HIGH**: 30 requests per minute (for sensitive operations)

## Default Behavior

- All endpoints default to **MID** level (60 requests per minute)
- Rate limiting is applied globally via `APP_GUARD`
- Rate limiting is tracked by IP address

## Usage

### Import the Decorator

```typescript
import { ThrottleLevel } from '../common/decorators/throttle-level.decorator';
import { ThrottleLevel as ThrottleLevelEnum } from '../common/enums/throttle-level.enum';
```

### Apply to Endpoints

```typescript
// Example: Allow more requests for login endpoint
@ThrottleLevel(ThrottleLevelEnum.LOW)
@Post('login')
async login() {
  // ...
}

// Example: Stricter rate limit for sensitive operations
@ThrottleLevel(ThrottleLevelEnum.HIGH)
@Post('reset-password')
async resetPassword() {
  // ...
}

// Default (MID) - no decorator needed
@Get('users')
async findAll() {
  // ...
}
```

## When to Use Each Level

- **LOW**: Authentication endpoints (login, signup, register, refresh token)
- **MID**: Default for all endpoints (no decorator needed)
- **MODERATE**: Endpoints that need slightly stricter limits
- **HIGH**: Sensitive operations (password reset, payment processing, admin operations)

## Rate Limit Configuration

All levels use a 60-second (1 minute) time window:
- LOW: 100 requests/minute
- MID: 60 requests/minute (default)
- MODERATE: 45 requests/minute
- HIGH: 30 requests/minute

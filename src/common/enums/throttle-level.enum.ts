export enum ThrottleLevel {
  LOW = 'low',        // More requests allowed (e.g., 100 requests per minute)
  MID = 'mid',       // Default - moderate rate (e.g., 60 requests per minute)
  HIGH = 'high',     // Strict rate (e.g., 30 requests per minute)
  MODERATE = 'moderate', // Between mid and high (e.g., 45 requests per minute)
}

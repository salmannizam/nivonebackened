/**
 * System notification events
 * These are hardcoded events that can trigger notifications
 * No custom events allowed
 */
export enum NotificationEvent {
  RESIDENT_CREATED = 'resident.created',
  RESIDENT_ASSIGNED_ROOM = 'resident.assigned_room',
  PAYMENT_DUE = 'payment.due',
  PAYMENT_PAID = 'payment.paid',
  SECURITY_DEPOSIT_RECEIVED = 'security_deposit.received',
  RESIDENT_VACATED = 'resident.vacated',
  OTP_SENT = 'otp.sent', // OTP for resident portal login
}

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

/**
 * Notification delivery status
 */
export enum NotificationStatus {
  SENT = 'SENT',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

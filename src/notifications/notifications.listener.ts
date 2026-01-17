import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { NotificationEvent, NotificationChannel } from './enums/notification-event.enum';

/**
 * Event listener for system events
 * Listens to events emitted by other modules and triggers notifications
 */
@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('resident.created')
  async handleResidentCreated(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string }) {
    this.logger.log(`Resident created event: ${payload.residentId}`);
    
    // Send email notification if email available
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_CREATED,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `Welcome! You have been registered as a resident.`,
        subject: 'Welcome - Resident Registration',
      });
    }

    // Send SMS notification if phone available
    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_CREATED,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `Welcome! You have been registered as a resident.`,
        residentId: payload.residentId,
      });
    }
  }

  @OnEvent('resident.assigned_room')
  async handleResidentAssignedRoom(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string; roomNumber: string }) {
    this.logger.log(`Resident assigned room event: ${payload.residentId} -> ${payload.roomNumber}`);
    
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_ASSIGNED_ROOM,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `You have been assigned to room ${payload.roomNumber}.`,
        subject: 'Room Assignment',
        residentId: payload.residentId,
      });
    }

    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_ASSIGNED_ROOM,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `You have been assigned to room ${payload.roomNumber}.`,
        residentId: payload.residentId,
      });
    }
  }

  @OnEvent('payment.due')
  async handlePaymentDue(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string; amount: number; dueDate: string }) {
    this.logger.log(`Payment due event: ${payload.residentId} - ₹${payload.amount}`);
    
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.PAYMENT_DUE,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `Payment of ₹${payload.amount} is due on ${new Date(payload.dueDate).toLocaleDateString()}. Please make the payment on time.`,
        subject: 'Payment Due Reminder',
        residentId: payload.residentId,
      });
    }

    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.PAYMENT_DUE,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `Payment of ₹${payload.amount} is due on ${new Date(payload.dueDate).toLocaleDateString()}.`,
        residentId: payload.residentId,
      });
    }
  }

  @OnEvent('payment.paid')
  async handlePaymentPaid(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string; amount: number }) {
    this.logger.log(`Payment paid event: ${payload.residentId} - ₹${payload.amount}`);
    
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.PAYMENT_PAID,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `Payment of ₹${payload.amount} has been received. Thank you!`,
        subject: 'Payment Received',
        residentId: payload.residentId,
      });
    }

    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.PAYMENT_PAID,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `Payment of ₹${payload.amount} received. Thank you!`,
        residentId: payload.residentId,
      });
    }
  }

  @OnEvent('security_deposit.received')
  async handleSecurityDepositReceived(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string; amount: number }) {
    this.logger.log(`Security deposit received event: ${payload.residentId} - ₹${payload.amount}`);
    
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.SECURITY_DEPOSIT_RECEIVED,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `Security deposit of ₹${payload.amount} has been received.`,
        subject: 'Security Deposit Received',
        residentId: payload.residentId,
      });
    }

    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.SECURITY_DEPOSIT_RECEIVED,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `Security deposit of ₹${payload.amount} received.`,
        residentId: payload.residentId,
      });
    }
  }

  @OnEvent('resident.vacated')
  async handleResidentVacated(payload: { tenantId: string; residentId: string; residentEmail?: string; residentPhone?: string }) {
    this.logger.log(`Resident vacated event: ${payload.residentId}`);
    
    if (payload.residentEmail) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_VACATED,
        channel: NotificationChannel.EMAIL,
        recipient: payload.residentEmail,
        message: `Your check-out has been processed. Thank you for staying with us!`,
        subject: 'Check-out Confirmation',
        residentId: payload.residentId,
      });
    }

    if (payload.residentPhone) {
      await this.notificationsService.sendNotification({
        tenantId: payload.tenantId,
        event: NotificationEvent.RESIDENT_VACATED,
        channel: NotificationChannel.SMS,
        recipient: payload.residentPhone,
        message: `Your check-out has been processed. Thank you!`,
        residentId: payload.residentId,
      });
    }
  }
}

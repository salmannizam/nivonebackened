import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Email provider interface
 * Abstract interface for email sending
 */
export interface EmailProvider {
  sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * SMTP Email provider implementation using nodemailer
 */
@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = this.configService.get<number>('MAIL_PORT', 465);
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPassword = this.configService.get<string>('MAIL_PASSWORD');
    const mailSecure = this.configService.get<boolean>('MAIL_SECURE', true);
    const mailFrom = this.configService.get<string>('MAIL_FROM', mailUser);

    if (!mailHost || !mailUser || !mailPassword) {
      this.logger.warn('Email configuration incomplete. Email sending will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: mailSecure, // true for 465, false for other ports
      auth: {
        user: mailUser,
        pass: mailPassword,
      },
    });

    // Verify connection
    this.transporter.verify((error) => {
      if (error) {
        this.logger.error('SMTP connection failed:', error);
      } else {
        this.logger.log('SMTP server is ready to send emails');
      }
    });
  }

  async sendEmail(params: {
    to: string;
    subject: string;
    body: string;
    html?: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.transporter) {
        return {
          success: false,
          error: 'Email configuration not available',
        };
      }

      const mailFrom = this.configService.get<string>('MAIL_FROM') || 
                      this.configService.get<string>('MAIL_USER');

      const info = await this.transporter.sendMail({
        from: mailFrom,
        to: params.to,
        subject: params.subject,
        text: params.body,
        html: params.html || params.body.replace(/\n/g, '<br>'),
      });

      this.logger.log(`Email sent successfully to ${params.to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email to ${params.to}:`, error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

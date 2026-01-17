import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * SMS provider interface
 * Abstract interface for SMS sending
 */
export interface SmsProvider {
  sendSms(params: {
    to: string;
    message: string;
    templateId?: string;
    variables?: Record<string, string>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

/**
 * DLT-compliant SMS provider implementation
 * Supports template-based SMS with DLT registration
 */
@Injectable()
export class DltSmsProvider implements SmsProvider {
  private readonly logger = new Logger(DltSmsProvider.name);
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('SMS_API_KEY') || '';
    this.senderId = this.configService.get<string>('SMS_SENDER_ID') || 'FWMSPL';
    this.baseUrl = this.configService.get<string>('SMS_API_URL') || 'https://api.textlocal.in/send/';

    if (!this.apiKey) {
      this.logger.warn('SMS API key not configured. SMS sending will be disabled.');
    }
  }

  async sendSms(params: {
    to: string;
    message: string;
    templateId?: string;
    variables?: Record<string, string>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.apiKey) {
        return {
          success: false,
          error: 'SMS API key not configured',
        };
      }

      // Clean phone number (remove +, spaces, etc.)
      const phoneNumber = params.to.replace(/[^0-9]/g, '');
      
      // If phone doesn't start with country code, assume it's Indian (+91)
      const formattedPhone = phoneNumber.startsWith('91') 
        ? phoneNumber 
        : `91${phoneNumber}`;

      // Get DLT configuration
      const dltTemplateId = params.templateId || 
                           this.configService.get<string>('DLT_TEMPLATE_ID') || 
                           '';
      const tmId = this.configService.get<string>('TM_ID') || '';
      const dltHeaderId = this.configService.get<string>('DLT_HEADER_ID') || '';
      const dltEntityId = this.configService.get<string>('DLT_ENTITY_ID') || '';

      // Prepare message - if template ID is provided, use template format
      let finalMessage = params.message;
      if (params.variables && Object.keys(params.variables).length > 0) {
        // Replace variables in message
        Object.entries(params.variables).forEach(([key, value]) => {
          finalMessage = finalMessage.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        });
      }

      // Prepare API request
      const requestData: any = {
        apikey: this.apiKey,
        numbers: formattedPhone,
        message: finalMessage,
        sender: this.senderId,
      };

      // Add DLT parameters if available
      if (dltTemplateId) {
        requestData.template_id = dltTemplateId;
      }
      if (tmId) {
        requestData.tm_id = tmId;
      }
      if (dltHeaderId) {
        requestData.dlt_header_id = dltHeaderId;
      }
      if (dltEntityId) {
        requestData.dlt_entity_id = dltEntityId;
      }

      // Send SMS via API
      const response = await axios.post(this.baseUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.data && response.data.status === 'success') {
        this.logger.log(`SMS sent successfully to ${formattedPhone}`);
        return {
          success: true,
          messageId: response.data.batch_id || `sms-${Date.now()}`,
        };
      } else {
        const errorMsg = response.data?.errors?.[0]?.message || 'Unknown error';
        this.logger.error(`SMS sending failed: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      }
    } catch (error: any) {
      this.logger.error(`Failed to send SMS to ${params.to}:`, error.message);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    }
  }
}

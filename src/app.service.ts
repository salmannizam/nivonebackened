import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHealth() {
    return {
      status: 'ok',
      mode: this.configService.get('APP_MODE'),
      timestamp: new Date().toISOString(),
    };
  }
}

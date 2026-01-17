import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';
import { RequestWithTenant } from '../../common/interfaces/request.interface';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string, req: RequestWithTenant): Promise<any> {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    const user = await this.authService.validateUser(email, password, tenantId);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }
}

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';
import { AuthConfig } from '../config/auth.config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly jwtBlacklistService: JwtBlacklistService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: AuthConfig.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; jti?: string }) {
    // Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await this.jwtBlacklistService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }
    
    return { id: payload.sub };
  }
}

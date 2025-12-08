import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';
import { AuthConfig } from '../config/auth.config';
import { PrismaService } from '../../db/prisma.service';
import { AuthCacheService } from '../services/auth-cache.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly jwtBlacklistService: JwtBlacklistService,
    private readonly prisma: PrismaService,
    private readonly cache: AuthCacheService,
  ) {
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
    
    // Check if user is banned or suspended (with caching)
    const cacheKey = `user:ban-suspend:${payload.sub}`;
    const userStatus = await this.cache.getOrCompute(
      cacheKey,
      async () => {
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            isBanned: true,
            suspendedUntil: true,
            deletedAt: true,
          },
        });
        
        return {
          exists: !!user && !user.deletedAt,
          isBanned: user?.isBanned || false,
          suspendedUntil: user?.suspendedUntil?.toISOString() || null,
        };
      },
      300, // 5분 캐시
    );

    if (!userStatus.exists) {
      throw new UnauthorizedException('User not found');
    }

    if (userStatus.isBanned) {
      throw new UnauthorizedException('Your account has been banned');
    }

    if (userStatus.suspendedUntil && new Date() < new Date(userStatus.suspendedUntil)) {
      throw new UnauthorizedException(`Your account is suspended until ${userStatus.suspendedUntil}`);
    }
    
    return { id: payload.sub };
  }
}

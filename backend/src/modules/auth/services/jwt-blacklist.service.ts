import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../db/prisma.service';

// JWT Blacklist Service
// Handles blacklisting of JWT tokens (for logout)
@Injectable()
export class JwtBlacklistService {
  private readonly logger = new Logger(JwtBlacklistService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Blacklist a JWT token
  // Token will be rejected even if signature is valid
  async blacklistToken(token: string, reason: string = 'logout'): Promise<void> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const decoded = this.jwtService.decode(token) as any;

      if (!decoded || !decoded.jti || !decoded.exp) {
        this.logger.warn('[blacklistToken] Invalid token format');
        return;
      }

      const expiresAt = new Date(decoded.exp * 1000); // exp is in seconds

      await this.db.jwtBlacklist.create({
        data: {
          jti: decoded.jti,
          expiresAt,
          reason,
        },
      });

      this.logger.debug(`[blacklistToken] jti=${decoded.jti} reason=${reason} expiresAt=${expiresAt.toISOString()}`);
    } catch (error) {
      this.logger.error(`[blacklistToken] ERROR: ${(error as Error).message}`);
    }
  }

  // Check if a token is blacklisted
  async isBlacklisted(jti: string): Promise<boolean> {
    const blacklisted = await this.db.jwtBlacklist.findUnique({
      where: { jti },
    });

    const result = !!blacklisted;

    if (result) {
      this.logger.debug(`[isBlacklisted] jti=${jti} blacklisted=true reason=${blacklisted.reason}`);
    }

    return result;
  }

  // Clean up expired blacklisted tokens (should be run periodically)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db.jwtBlacklist.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.debug(`[cleanupExpiredTokens] deleted=${result.count}`);

    return result.count;
  }
}
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import * as crypto from 'crypto';
import { AuthConfig } from '../config/auth.config';

// OAuth State Service
// Handles OAuth state parameter for CSRF protection
@Injectable()
export class OAuthStateService {
  private readonly logger = new Logger(OAuthStateService.name);

  constructor(private readonly db: PrismaService) {}

  // Generate and store OAuth state
  // Returns state string to be used in OAuth flow
  async createState(provider: string, redirectUrl?: string): Promise<string> {
    // Generate cryptographically secure random state
    const state = crypto.randomBytes(32).toString('hex');

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + AuthConfig.OAUTH_STATE_TTL); // 10 minutes

    await this.db.oAuthState.create({
      data: {
        state,
        provider,
        redirectUrl,
        expiresAt,
      },
    });

    this.logger.debug(`[createState] provider=${provider} state=${state.substring(0, 8)}... expiresAt=${expiresAt.toISOString()}`);

    return state;
  }

  // Validate OAuth state
  // Throws if state is invalid, expired, or already used
  async validateState(state: string, provider: string): Promise<{ redirectUrl?: string }> {
    if (!state) {
      this.logger.warn('[validateState] Missing state parameter');
      throw new UnauthorizedException('Missing state parameter');
    }

    const stateRecord = await this.db.oAuthState.findUnique({
      where: { state },
    });

    if (!stateRecord) {
      this.logger.warn(`[validateState] Invalid state state=${state.substring(0, 8)}...`);
      throw new UnauthorizedException('Invalid or expired OAuth state');
    }

    if (stateRecord.provider !== provider) {
      this.logger.warn(`[validateState] Provider mismatch expected=${provider} actual=${stateRecord.provider}`);
      throw new UnauthorizedException('OAuth state provider mismatch');
    }

    if (stateRecord.usedAt) {
      this.logger.warn(`[validateState] State already used state=${state.substring(0, 8)}...`);
      throw new UnauthorizedException('OAuth state has already been used');
    }

    if (stateRecord.expiresAt < new Date()) {
      this.logger.warn(`[validateState] State expired state=${state.substring(0, 8)}...`);
      throw new UnauthorizedException('OAuth state has expired');
    }

    // Mark state as used
    await this.db.oAuthState.update({
      where: { id: stateRecord.id },
      data: { usedAt: new Date() },
    });

    this.logger.debug(`[validateState] SUCCESS provider=${provider} state=${state.substring(0, 8)}...`);

    return {
      redirectUrl: stateRecord.redirectUrl ?? undefined,
    };
  }

  // Clean up expired states (should be run periodically)
  async cleanupExpiredStates(): Promise<number> {
    const result = await this.db.oAuthState.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.debug(`[cleanupExpiredStates] deleted=${result.count}`);

    return result.count;
  }
}
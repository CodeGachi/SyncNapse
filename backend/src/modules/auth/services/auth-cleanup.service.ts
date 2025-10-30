import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RefreshTokenService } from './refresh-token.service';
import { OAuthStateService } from './oauth-state.service';
import { JwtBlacklistService } from './jwt-blacklist.service';

// Auth Cleanup Service
// Periodically cleans up expired tokens, states, and blacklist entries
@Injectable()
export class AuthCleanupService {
  private readonly logger = new Logger(AuthCleanupService.name);

  constructor(
    private readonly refreshTokenService: RefreshTokenService,
    private readonly oauthStateService: OAuthStateService,
    private readonly jwtBlacklistService: JwtBlacklistService,
  ) {}

  // Run cleanup every day at 3 AM
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCleanup() {
    this.logger.log('[Cleanup] Starting auth cleanup job...');

    try {
      // Cleanup expired refresh tokens
      const refreshTokens = await this.refreshTokenService.cleanupExpiredTokens();
      this.logger.log(`[Cleanup] Removed ${refreshTokens} expired refresh tokens`);

      // Cleanup expired OAuth states
      const oauthStates = await this.oauthStateService.cleanupExpiredStates();
      this.logger.log(`[Cleanup] Removed ${oauthStates} expired OAuth states`);

      // Cleanup expired JWT blacklist entries
      const jwtBlacklist = await this.jwtBlacklistService.cleanupExpiredTokens();
      this.logger.log(`[Cleanup] Removed ${jwtBlacklist} expired JWT blacklist entries`);

      this.logger.log('[Cleanup] Auth cleanup job completed successfully');
    } catch (error) {
      this.logger.error(`[Cleanup] Error during cleanup: ${(error as Error).message}`);
    }
  }
}
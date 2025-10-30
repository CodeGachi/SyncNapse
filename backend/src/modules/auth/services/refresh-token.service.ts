import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma.service';
import * as crypto from 'crypto';

// Refresh Token Service
// Handles refresh token creation, validation, and rotation
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);
  private readonly REFRESH_TOKEN_LENGTH = 64; // bytes

  constructor(private readonly db: PrismaService) {}

  // Create a new refresh token for a user
  async createRefreshToken(
    userId: string,
    expiresInDays: number,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ token: string; tokenId: string }> {
    // Generate cryptographically secure random token
    const token = crypto.randomBytes(this.REFRESH_TOKEN_LENGTH).toString('hex');
    const tokenHash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const refreshToken = await this.db.refreshToken.create({
      data: {
        userId,
        token: tokenHash,
        expiresAt,
        ipAddress: metadata?.ipAddress,
        userAgent: metadata?.userAgent,
      },
    });

    this.logger.debug(`[createRefreshToken] userId=${userId} tokenId=${refreshToken.id} expiresAt=${expiresAt.toISOString()}`);

    return {
      token, // Return plain token to user
      tokenId: refreshToken.id,
    };
  }

  // Validate and rotate refresh token
  // Returns new tokens if valid, throws if invalid
  async validateAndRotate(
    token: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<{ userId: string; newToken: string; newTokenId: string }> {
    const tokenHash = this.hashToken(token);

    // Find refresh token
    const refreshToken = await this.db.refreshToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    // Validation checks
    if (!refreshToken) {
      this.logger.warn('[validateAndRotate] Token not found');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (refreshToken.revokedAt) {
      this.logger.warn(`[validateAndRotate] Token already revoked tokenId=${refreshToken.id} reason=${refreshToken.revokedReason}`);
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (refreshToken.usedAt) {
      // Token reuse detected - possible attack!
      this.logger.error(`[validateAndRotate] TOKEN REUSE DETECTED! tokenId=${refreshToken.id} userId=${refreshToken.userId}`);
      
      // Revoke entire token family for security
      await this.revokeTokenFamily(refreshToken.id, 'token_reuse_detected');
      
      throw new UnauthorizedException('Refresh token has already been used');
    }

    if (refreshToken.expiresAt < new Date()) {
      this.logger.warn(`[validateAndRotate] Token expired tokenId=${refreshToken.id}`);
      await this.db.refreshToken.update({
        where: { id: refreshToken.id },
        data: { revokedAt: new Date(), revokedReason: 'expired' },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    // Mark current token as used
    await this.db.refreshToken.update({
      where: { id: refreshToken.id },
      data: { usedAt: new Date() },
    });

    // Create new refresh token (rotation)
    const { token: newToken, tokenId: newTokenId } = await this.createRefreshToken(
      refreshToken.userId,
      30, // 30 days
      metadata,
    );

    // Link old token to new token
    await this.db.refreshToken.update({
      where: { id: refreshToken.id },
      data: { replacedBy: newTokenId },
    });

    this.logger.debug(`[validateAndRotate] SUCCESS userId=${refreshToken.userId} oldTokenId=${refreshToken.id} newTokenId=${newTokenId}`);

    return {
      userId: refreshToken.userId,
      newToken,
      newTokenId,
    };
  }

  // Revoke a single refresh token
  async revokeToken(token: string, reason: string = 'user_logout'): Promise<void> {
    const tokenHash = this.hashToken(token);

    const result = await this.db.refreshToken.updateMany({
      where: {
        token: tokenHash,
        revokedAt: null, // Only revoke if not already revoked
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    this.logger.debug(`[revokeToken] revoked=${result.count} reason=${reason}`);
  }

  // Revoke all refresh tokens for a user
  async revokeAllUserTokens(userId: string, reason: string = 'security'): Promise<number> {
    const result = await this.db.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    this.logger.log(`[revokeAllUserTokens] userId=${userId} revoked=${result.count} reason=${reason}`);

    return result.count;
  }

  // Revoke token family (chain of replaced tokens)
  // Used when token reuse is detected
  private async revokeTokenFamily(tokenId: string, reason: string): Promise<void> {
    // Find all tokens in the family (recursively follow replacedBy)
    const tokens = await this.db.refreshToken.findMany({
      where: {
        OR: [
          { id: tokenId },
          { replacedBy: tokenId },
        ],
        revokedAt: null,
      },
    });

    if (tokens.length > 0) {
      await this.db.refreshToken.updateMany({
        where: {
          id: { in: tokens.map((t) => t.id) },
        },
        data: {
          revokedAt: new Date(),
          revokedReason: reason,
        },
      });

      this.logger.warn(`[revokeTokenFamily] Revoked ${tokens.length} tokens in family. reason=${reason}`);
    }
  }

  // Clean up expired tokens (should be run periodically)
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.db.refreshToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    this.logger.debug(`[cleanupExpiredTokens] deleted=${result.count}`);

    return result.count;
  }

  // Hash token using SHA-256
  // Tokens are hashed before storing in database
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
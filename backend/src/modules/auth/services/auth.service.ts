import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { OAuthService } from './oauth.service';
import { RefreshTokenService } from './refresh-token.service';
import { JwtBlacklistService } from './jwt-blacklist.service';
import { AuthConfig } from '../config/auth.config';
import * as crypto from 'crypto';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly oauthService: OAuthService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly jwtBlacklistService: JwtBlacklistService,
  ) {}

  async validateUserByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async getUserById(userId: string) {
    return this.usersService.findById(userId);
  }

  // Sign access token with JTI (JWT ID) for blacklisting support
  async signAccessToken(userId: string): Promise<string> {
    const jti = crypto.randomUUID();
    return this.jwtService.signAsync(
      {
        sub: userId,
        jti,
        type: 'access',
      },
      {
        expiresIn: AuthConfig.JWT_ACCESS_EXPIRATION,
      },
    );
  }

  // Legacy method - kept for backward compatibility
  async signToken(userId: string): Promise<string> {
    return this.signAccessToken(userId);
  }

  // Create both access and refresh tokens
  async createTokenPair(
    userId: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    // Create access token
    const accessToken = await this.signAccessToken(userId);

    // Create refresh token
    const { token: refreshToken } = await this.refreshTokenService.createRefreshToken(
      userId,
      30, // 30 days
      metadata,
    );

    this.logger.debug(`[createTokenPair] userId=${userId}`);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiration(AuthConfig.JWT_ACCESS_EXPIRATION),
    };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(
    refreshToken: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    // Validate and rotate refresh token
    const { userId, newToken } = await this.refreshTokenService.validateAndRotate(
      refreshToken,
      metadata,
    );

    // Create new access token
    const accessToken = await this.signAccessToken(userId);

    this.logger.debug(`[refreshAccessToken] userId=${userId}`);

    return {
      accessToken,
      refreshToken: newToken,
      expiresIn: this.parseExpiration(AuthConfig.JWT_ACCESS_EXPIRATION),
    };
  }

  // Logout user (blacklist access token and revoke refresh token)
  async logout(
    accessToken: string,
    refreshToken?: string,
  ): Promise<void> {
    // Blacklist access token
    await this.jwtBlacklistService.blacklistToken(accessToken, 'logout');

    // Revoke refresh token if provided
    if (refreshToken) {
      await this.refreshTokenService.revokeToken(refreshToken, 'user_logout');
    }

    this.logger.debug('[logout] User logged out');
  }

  // Logout from all devices (revoke all refresh tokens)
  async logoutAll(userId: string): Promise<void> {
    await this.refreshTokenService.revokeAllUserTokens(userId, 'logout_all_devices');
    this.logger.log(`[logoutAll] userId=${userId} All devices logged out`);
  }

  // Validate JWT and check blacklist
  async validateToken(token: string): Promise<{ userId: string; jti: string }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decoded = this.jwtService.decode(token) as any;

    if (!decoded || !decoded.jti) {
      throw new UnauthorizedException('Invalid token format');
    }

    // Check blacklist
    const isBlacklisted = await this.jwtBlacklistService.isBlacklisted(decoded.jti);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return {
      userId: decoded.sub,
      jti: decoded.jti,
    };
  }

  async getOAuthAuthorizationUrl(provider: string, redirectUrl?: string) {
    return this.oauthService.buildAuthUrl(provider, { redirectUrl });
  }

  async authenticateWithOAuth(
    provider: string,
    code: string,
    state: string,
    metadata?: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenPair> {
    const { user } = await this.oauthService.handleCallback(provider, code, state);
    return this.createTokenPair(user.id, metadata);
  }

  // Parse expiration string (15m, 1h, 7d) to seconds
  private parseExpiration(exp: string): number {
    const match = exp.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }
}

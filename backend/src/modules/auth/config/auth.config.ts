import { Logger } from '@nestjs/common';

const logger = new Logger('AuthConfig');

export class AuthConfig {
  // JWT Configuration
  static readonly JWT_SECRET = process.env.JWT_SECRET;
  static readonly JWT_ACCESS_EXPIRATION = process.env.JWT_ACCESS_EXPIRATION || '15m';
  static readonly JWT_REFRESH_EXPIRATION = process.env.JWT_REFRESH_EXPIRATION || '30d';

  // OAuth Configuration
  static readonly GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  static readonly GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  static readonly GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

  // Cache Configuration (in-memory)
  static readonly CACHE_TTL = parseInt(process.env.CACHE_TTL || '300', 10); // 5 minutes default

  // Security Configuration
  static readonly ENABLE_RATE_LIMITING = process.env.ENABLE_RATE_LIMITING !== 'false';
  static readonly RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '100', 10);
  static readonly RATE_LIMIT_TTL = parseInt(process.env.RATE_LIMIT_TTL || '60', 10);

  // OAuth State TTL (10 minutes)
  static readonly OAUTH_STATE_TTL = 600;

  static validate(): void {
    const errors: string[] = [];
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;

    // Check JWT_SECRET (skip in test environment)
    if (!isTestEnv) {
      if (!this.JWT_SECRET) {
        errors.push('JWT_SECRET is required');
      } else if (this.JWT_SECRET.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
      }

      // Check OAuth config (only if using OAuth)
      const usingOAuth = this.GOOGLE_CLIENT_ID || this.GOOGLE_CLIENT_SECRET;
      if (usingOAuth) {
        if (!this.GOOGLE_CLIENT_ID) {
          errors.push('GOOGLE_CLIENT_ID is required when using OAuth');
        }
        if (!this.GOOGLE_CLIENT_SECRET) {
          errors.push('GOOGLE_CLIENT_SECRET is required when using OAuth');
        }
        if (!this.GOOGLE_CALLBACK_URL) {
          errors.push('GOOGLE_CALLBACK_URL is required when using OAuth');
        }
      }
    }

    // Log configuration (without sensitive data) - only in non-test environment
    if (!isTestEnv) {
      logger.log('Auth Configuration:');
      logger.log(`  JWT_SECRET: ${this.JWT_SECRET ? 'Set' : 'Missing'}`);
      logger.log(`  JWT_ACCESS_EXPIRATION: ${this.JWT_ACCESS_EXPIRATION}`);
      logger.log(`  JWT_REFRESH_EXPIRATION: ${this.JWT_REFRESH_EXPIRATION}`);
      logger.log(`  GOOGLE_CLIENT_ID: ${this.GOOGLE_CLIENT_ID ? 'Set' : 'Missing'}`);
      logger.log(`  GOOGLE_CLIENT_SECRET: ${this.GOOGLE_CLIENT_SECRET ? 'Set' : 'Missing'}`);
      logger.log(`  GOOGLE_CALLBACK_URL: ${this.GOOGLE_CALLBACK_URL ? 'Set' : 'Missing'}`);
      logger.log(`  CACHE_TTL: ${this.CACHE_TTL}s`);
      logger.log(`  RATE_LIMITING: ${this.ENABLE_RATE_LIMITING ? 'Enabled' : 'Disabled'}`);
    }

    if (errors.length > 0) {
      throw new Error(`Auth configuration errors:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    }

    if (!isTestEnv) {
      logger.log('Auth configuration validated successfully');
    }
  }
}

// Validate on module load
AuthConfig.validate();
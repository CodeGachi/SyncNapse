import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { UsersModule } from '../users/users.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { OAuthService } from './services/oauth.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { OAuthStateService } from './services/oauth-state.service';
import { JwtBlacklistService } from './services/jwt-blacklist.service';
import { AuthCacheService } from './services/auth-cache.service';
import { AuthCleanupService } from './services/auth-cleanup.service';
import { AuthConfig } from './config/auth.config';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    ScheduleModule.forRoot(), // Enable scheduled tasks
    JwtModule.register({
      secret: AuthConfig.JWT_SECRET,
      signOptions: { expiresIn: AuthConfig.JWT_ACCESS_EXPIRATION },
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    OAuthService,
    RefreshTokenService,
    OAuthStateService,
    JwtBlacklistService,
    AuthCacheService,
    AuthCleanupService,
  ],
  controllers: [AuthController],
  exports: [AuthService, AuthCacheService, JwtModule], // Export cache for use in guards
})
export class AuthModule {}

import { Controller, Get, Post, Body, Query, Res, Req, UseGuards, HttpStatus, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './services/auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AuthConfig } from './config/auth.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Start Google OAuth flow' })
  async googleAuth() {
    // Initiates the Google OAuth flow
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with tokens' })
  async googleAuthCallback(@Req() req: any, @Res() res: Response) {
    const user = req.user as { id: string; deletedAt?: Date };
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (user.deletedAt) {
      const restoreToken = await this.authService.signRestoreToken(user.id);
      // Redirect to a special frontend page for restore
      // Validated redirect only to our frontend
      return res.redirect(`${frontendUrl}/auth/restore?token=${restoreToken}`);
    }

    // Normal Login
    const { accessToken, refreshToken } = await this.authService.createTokenPair(user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Set Refresh Token Cookie (Matching frontend cookie name: 'refreshToken')
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Set Access Token Cookie (Matching frontend cookie name: 'authToken')
    res.cookie('authToken', accessToken, {
      httpOnly: false, // Frontend reads this in AuthInitializer
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes expiry
    });

    // Redirect to frontend with tokens
    // MATCHING FRONTEND EXPECTATIONS:
    // oauth-callback.tsx expects 'accessToken' and 'refreshToken' in query params
    const redirectUrl = `${frontendUrl}/auth/callback?accessToken=${accessToken}&refreshToken=${refreshToken}&redirect=${encodeURIComponent('/dashboard/main')}`;
    
    this.logger.log(`[googleAuthCallback] Redirecting to: ${redirectUrl}`);
    
    res.redirect(redirectUrl);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Req() req: any, @Res({ passthrough: true }) res: Response) {
    // Check 'refreshToken' cookie (frontend name) first, fallback to 'refresh_token' just in case
    const refreshToken = req.cookies['refreshToken'] || req.cookies['refresh_token'];
    
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token found');
    }

    const tokens = await this.authService.refreshAccessToken(refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Rotate refresh token cookie (using 'refreshToken' name)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@CurrentUser() user: { id: string }, @Req() req: any, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refreshToken'] || req.cookies['refresh_token'];
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (accessToken) {
      await this.authService.logout(accessToken, refreshToken);
    }

    // Clear cookies
    res.clearCookie('refreshToken');
    res.clearCookie('refresh_token'); // Clear old one too
    res.clearCookie('authToken');
    
    return { message: 'Logged out successfully' };
  }
  
  // [NEW] Account Restoration
  
  @Post('restore')
  @ApiOperation({ summary: 'Restore soft-deleted account' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } } } })
  async restoreAccount(@Body('token') token: string) {
    // Validate restore token
    const payload = await this.authService.validateToken(token);
    if (payload.type !== 'restore_token') {
      throw new UnauthorizedException('Invalid token type');
    }

    const result = await this.usersService.restoreUser(payload.userId);
    return result;
  }

  @Post('permanent-delete')
  @ApiOperation({ summary: 'Permanently delete account immediately' })
  @ApiBody({ schema: { properties: { token: { type: 'string' } } } })
  async permanentDelete(@Body('token') token: string) {
    // Validate restore token (auth required even for deletion)
    const payload = await this.authService.validateToken(token);
    if (payload.type !== 'restore_token') {
      throw new UnauthorizedException('Invalid token type');
    }

    await this.usersService.hardDeleteUser(payload.userId);
    return { message: 'Account permanently deleted' };
  }
}

import { Controller, Get, Post, Body, HttpException, HttpStatus, Logger, Req, Res, UseGuards, Headers } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OAuthCallbackResponseDto, RefreshTokenDto, LogoutDto, TokenPairDto } from './dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService, private readonly links: LinkBuilderService) {}

  @Get('login')
  @ApiOperation({ summary: 'List supported login methods (HATEOAS)' })
  async loginOptions() {
    const nowTs = Date.now();
    this.logger.debug(`[loginOptions] ts=${nowTs}`);
    return {
      providers: [
        {
          id: 'google',
          label: 'Google',
          _links: {
            start: this.links.action('/api/auth/google', 'GET'),
          },
        },
      ],
      _links: {
        self: this.links.self('/api/auth/login'),
        up: this.links.up('/api'),
      },
    };
  }

  @Get('google')
  @ApiOperation({ summary: 'Start Google OAuth login' })
  async googleAuth(@Res() res: { redirect: (url: string) => void }) {
    const authUrl = await this.authService.getOAuthAuthorizationUrl('google');
    this.logger.debug(`redirect to ${authUrl}`);
    return res.redirect(authUrl);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiOkResponse({ type: OAuthCallbackResponseDto })
  async googleCallback(@Req() req: { query?: { code?: string; state?: string }; ip?: string; headers?: Record<string, string> }): Promise<OAuthCallbackResponseDto> {
    const code = req.query?.code as string | undefined;
    const state = req.query?.state as string | undefined;
    
    if (!code) throw new HttpException('Missing code', HttpStatus.BAD_REQUEST);
    if (!state) throw new HttpException('Missing state', HttpStatus.BAD_REQUEST);
    
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
    
    const tokens = await this.authService.authenticateWithOAuth('google', code, state, metadata);
    
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      tokenType: 'Bearer',
      _links: {
        self: this.links.self('/auth/google/callback'),
        me: this.links.action('/users/me', 'GET'),
        refresh: this.links.action('/auth/refresh', 'POST'),
        logout: this.links.action('/auth/logout', 'POST'),
      },
    };
  }
  
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiOkResponse({ type: TokenPairDto })
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: { ip?: string; headers?: Record<string, string> },
  ): Promise<TokenPairDto> {
    const metadata = {
      ipAddress: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
    
    const tokens = await this.authService.refreshAccessToken(body.refreshToken, metadata);
    
    this.logger.debug('[refresh] Token refreshed successfully');
    
    return tokens;
  }
  
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout (revoke tokens)' })
  @ApiOkResponse({ 
    schema: { 
      type: 'object', 
      properties: { message: { type: 'string' } } 
    } 
  })
  async logout(
    @Headers('authorization') authorization: string,
    @Body() body: LogoutDto,
    @Req() req: { user?: { id?: string } },
  ): Promise<{ message: string }> {
    const accessToken = authorization?.replace('Bearer ', '');
    const user = req.user as { id: string };
    
    if (body.logoutAll) {
      // Logout from all devices
      await this.authService.logoutAll(user.id);
      this.logger.log(`[logout] userId=${user.id} logged out from all devices`);
      return { message: 'Logged out from all devices' };
    }
    
    // Regular logout
    await this.authService.logout(accessToken, body.refreshToken);
    this.logger.debug('[logout] User logged out');
    
    return { message: 'Logged out successfully' };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check JWT authentication' })
  async check(@Req() req: { user?: { id?: string } }) {
    const user = req.user as { id: string };
    this.logger.debug(`auth check userId=${user?.id ?? 'unknown'}`);
    return { ok: true };
  }
}

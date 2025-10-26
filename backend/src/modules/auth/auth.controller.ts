import { Controller, Get, HttpException, HttpStatus, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { OAuthCallbackResponseDto } from './dto/oauth.dto';

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
  async googleAuth(@Res() res: any) {
    const authUrl = await this.authService.getOAuthAuthorizationUrl('google');
    this.logger.debug(`redirect to ${authUrl}`);
    return res.redirect(authUrl);
  }

  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  @ApiOkResponse({ type: OAuthCallbackResponseDto })
  async googleCallback(@Req() req: any): Promise<OAuthCallbackResponseDto> {
    const code = req.query?.code as string | undefined;
    if (!code) throw new HttpException('Missing code', HttpStatus.BAD_REQUEST);
    const { token } = await this.authService.authenticateWithOAuth('google', code);
    return {
      token,
      _links: {
        self: this.links.self('/auth/google/callback'),
        me: this.links.action('/users/me', 'GET'),
      },
    };
  }

  @Get('check')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Check JWT authentication' })
  async check(@Req() req: any) {
    const user = req.user as { id: string };
    this.logger.debug(`auth check userId=${user?.id ?? 'unknown'}`);
    return { ok: true };
  }
}

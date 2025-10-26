import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

type ProviderConfig = {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string | undefined;
  clientSecret?: string | undefined;
  callbackUrl: string | undefined;
  defaultScopes: string[];
  mapUser: (raw: any) => { email: string; displayName: string; providerUserId: string };
};

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(private readonly usersService: UsersService) {}

  private providers(): Record<string, ProviderConfig> {
    return {
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: process.env.GOOGLE_CALLBACK_URL,
        defaultScopes: ['openid', 'profile', 'email'],
        mapUser: (raw: any) => ({
          email: raw.email,
          displayName: raw.name ?? raw.email?.split('@')[0] ?? 'user',
          providerUserId: raw.sub,
        }),
      },
    };
  }

  buildAuthUrl(provider: string, opts?: { scope?: string[]; state?: string }) {
    const cfg = this.providers()[provider];
    if (!cfg?.clientId || !cfg?.callbackUrl) throw new UnauthorizedException('OAuth provider not configured');
    const params = new URLSearchParams({
      client_id: cfg.clientId,
      redirect_uri: cfg.callbackUrl,
      response_type: 'code',
      scope: (opts?.scope ?? cfg.defaultScopes).join(' '),
      include_granted_scopes: 'true',
      access_type: 'offline',
    });
    if (opts?.state) params.set('state', opts.state);
    const url = `${cfg.authUrl}?${params.toString()}`;
    this.logger.debug(`buildAuthUrl provider=${provider}`);
    return url;
  }

  async exchangeCode(provider: string, code: string) {
    const cfg = this.providers()[provider];
    if (!cfg?.clientId || !cfg?.callbackUrl) throw new UnauthorizedException('OAuth provider not configured');
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: cfg.clientId,
      redirect_uri: cfg.callbackUrl,
    });
    if (cfg.clientSecret) body.set('client_secret', cfg.clientSecret);

    const res = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.debug(`token exchange failed status=${res.status} body=${text}`);
      throw new UnauthorizedException('OAuth token exchange failed');
    }
    const tokens = await res.json();
    return tokens as { access_token: string; id_token?: string };
  }

  async fetchUserInfo(provider: string, accessToken: string) {
    const cfg = this.providers()[provider];
    const res = await fetch(cfg.userInfoUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      const text = await res.text();
      this.logger.debug(`userinfo fetch failed status=${res.status} body=${text}`);
      throw new UnauthorizedException('OAuth userinfo failed');
    }
    const raw = await res.json();
    return raw;
  }

  async handleCallback(provider: string, code: string) {
    const tokens = await this.exchangeCode(provider, code);
    const raw = await this.fetchUserInfo(provider, tokens.access_token);
    const cfg = this.providers()[provider];
    const mapped = cfg.mapUser(raw);
    this.logger.debug(`oauth mapped provider=${provider} email=${mapped.email}`);

    const user = await this.usersService.upsertGoogleUser({
      email: mapped.email,
      displayName: mapped.displayName,
    });
    return { user } as { user: { id: string } };
  }
}

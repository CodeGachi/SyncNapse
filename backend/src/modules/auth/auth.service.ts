import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { OAuthService } from './oauth.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly oauthService: OAuthService,
  ) {}

  async validateUserByEmail(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');
    return user;
  }

  async signToken(userId: string) {
    return this.jwtService.signAsync({ sub: userId });
  }

  async getOAuthAuthorizationUrl(provider: string) {
    return this.oauthService.buildAuthUrl(provider);
  }

  async authenticateWithOAuth(provider: string, code: string) {
    const { user } = await this.oauthService.handleCallback(provider, code);
    const token = await this.signToken(user.id);
    return { token };
  }
}

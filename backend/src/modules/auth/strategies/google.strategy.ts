import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { AuthConfig } from '../config/auth.config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly usersService: UsersService,
  ) {
    super({
      clientID: AuthConfig.GOOGLE_CLIENT_ID,
      clientSecret: AuthConfig.GOOGLE_CLIENT_SECRET,
      callbackURL: AuthConfig.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any, done: VerifyCallback): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails[0].value;
    
    // Upsert user in DB
    const user = await this.usersService.upsertGoogleUser({
      email,
      displayName: name.givenName ? `${name.givenName} ${name.familyName || ''}`.trim() : email.split('@')[0],
    });

    done(null, user);
  }
}

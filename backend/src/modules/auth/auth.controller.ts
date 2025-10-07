import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

class LoginDto {
  email!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto) {
    const user = await this.authService.validateUserByEmail(body.email);
    const accessToken = await this.authService.signToken(user.id);
    return { accessToken };
  }
}

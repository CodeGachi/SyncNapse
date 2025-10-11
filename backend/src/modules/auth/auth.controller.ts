import { Body, Controller, HttpCode, HttpException, HttpStatus, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiOperation } from '@nestjs/swagger';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { AuthService } from './auth.service';

class LoginDto {
  email!: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService, private readonly links: LinkBuilderService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login' })
  @ApiOkResponse({ description: 'Login returns token + HAL links', schema: { type: 'object' } })
  async login(@Body() body: LoginDto) {
    throw new HttpException('Auth login not implemented', HttpStatus.NOT_IMPLEMENTED);
  }
}

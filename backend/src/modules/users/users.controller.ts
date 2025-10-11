import { Controller, Get, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService, private readonly hal: HalService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOkResponse({ description: 'Current user (HAL)', schema: { type: 'object' } })
  async getMe(@CurrentUser() user: { id: string }) {
    // Skeleton only: mark as not implemented for now
    throw new HttpException('Users me not implemented', HttpStatus.NOT_IMPLEMENTED);
  }
}

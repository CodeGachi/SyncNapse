import { Controller, Get, HttpException, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService, private readonly hal: HalService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOkResponse({ description: 'Current user (HAL)', schema: { type: 'object' } })
  async getMe(@CurrentUser() user: { id: string }) {
    // Debug only: record current user id without exposing sensitive info
    this.logger.debug(`getMe called userId=${user?.id ?? 'unknown'}`);
    // Skeleton only: mark as not implemented for now
    throw new HttpException('Users me not implemented', HttpStatus.NOT_IMPLEMENTED);
  }
}

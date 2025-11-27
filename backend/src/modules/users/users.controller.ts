import { Controller, Get, Patch, Delete, Body, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { ApiOkResponse, ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { UserResponseDto, UpdateUserDto } from './dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  
  constructor(
    private readonly usersService: UsersService,
    private readonly hal: HalService,
    private readonly links: LinkBuilderService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'Current user with HAL links', type: UserResponseDto })
  async getMe(@CurrentUser() user: { id: string }) {
    this.logger.debug(`getMe called userId=${user?.id ?? 'unknown'}`);
    
    const userData = await this.usersService.findById(user.id);
    
    if (!userData) {
      throw new NotFoundException('User not found');
    }

    return this.hal.resource(
      {
        id: userData.id,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        authProvider: userData.authProvider,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      {
        self: this.links.self('/api/users/me'),
        update: this.links.action('/api/users/me', 'PATCH'),
        delete: this.links.action('/api/users/me', 'DELETE'),
        spaces: this.links.action('/api/spaces', 'GET'),
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({ description: 'Updated user with HAL links', type: UserResponseDto })
  async updateMe(
    @CurrentUser() user: { id: string },
    @Body() updateUserDto: UpdateUserDto,
  ) {
    this.logger.debug(`updateMe called userId=${user?.id ?? 'unknown'}`);
    
    const updatedUser = await this.usersService.updateUser(user.id, updateUserDto);
    
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return this.hal.resource(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        role: updatedUser.role,
        authProvider: updatedUser.authProvider,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
      {
        self: this.links.self('/api/users/me'),
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me')
  @ApiOperation({ summary: 'Soft delete current user account' })
  @ApiOkResponse({ description: 'User account deactivated' })
  async deleteMe(@CurrentUser() user: { id: string }) {
    this.logger.log(`deleteMe called userId=${user?.id}`);
    return this.usersService.softDeleteUser(user.id);
  }
}

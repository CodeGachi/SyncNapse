import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { UsersService } from './users.service';
import { UserListQueryDto, UserListResponseDto } from './dto';

/**
 * Users Controller (Admin)
 * Base URL: /api/admin/users
 * 
 * 관리자용 사용자 관리
 */
@ApiTags('Admin - Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 사용자 목록 조회
   * GET /api/admin/users
   */
  @Get()
  @ApiOperation({
    summary: '사용자 목록 조회',
    description: '필터링, 검색, 정렬, 페이지네이션을 지원하는 사용자 목록 조회',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 목록 조회 성공',
    type: UserListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 부족 (admin 또는 operator 역할 필요)',
  })
  async getUsers(@Query() query: UserListQueryDto): Promise<UserListResponseDto> {
    this.logger.debug(`GET /api/admin/users query=${JSON.stringify(query)}`);
    return await this.usersService.getUsers(query);
  }
}


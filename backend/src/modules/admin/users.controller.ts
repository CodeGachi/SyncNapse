import { Controller, Get, Patch, Post, Query, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { AdminOnlyGuard } from './guards/admin-only.guard';
import { UsersService } from './users.service';
import {
  UserListQueryDto,
  UserListResponseDto,
  UserDetailResponseDto,
  UpdateUserRoleDto,
  UpdateUserRoleResponseDto,
  SuspendUserDto,
  BanUserDto,
  UserStatusResponseDto,
} from './dto';

/**
 * Users Controller (Admin)
 * Base URL: /api/admin/users
 * 
 * 관리자용 사용자 관리
 */
@ApiTags('Admin')
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

  /**
   * 사용자 상세 조회
   * GET /api/admin/users/:userId
   */
  @Get(':userId')
  @ApiOperation({
    summary: '사용자 상세 조회',
    description: '특정 사용자의 상세 정보, 통계, 최근 활동을 조회합니다.',
  })
  @ApiParam({
    name: 'userId',
    description: '사용자 ID',
    example: 'user-001',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 상세 조회 성공',
    type: UserDetailResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 부족 (admin 또는 operator 역할 필요)',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async getUserDetail(@Param('userId') userId: string): Promise<UserDetailResponseDto> {
    this.logger.debug(`GET /api/admin/users/${userId}`);
    return await this.usersService.getUserDetail(userId);
  }

  /**
   * 사용자 역할 변경
   * PATCH /api/admin/users/:userId/role
   */
  @Patch(':userId/role')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard) // admin만 가능
  @ApiOperation({
    summary: '사용자 역할 변경',
    description: '사용자의 역할을 변경합니다. (admin 권한 필요)',
  })
  @ApiParam({
    name: 'userId',
    description: '사용자 ID',
    example: 'user-001',
  })
  @ApiResponse({
    status: 200,
    description: '역할 변경 성공',
    type: UpdateUserRoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 (이미 동일한 역할)',
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 부족 (admin 권한 필요)',
  })
  @ApiResponse({
    status: 404,
    description: '사용자를 찾을 수 없음',
  })
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<{ data: UpdateUserRoleResponseDto }> {
    this.logger.debug(`PATCH /api/admin/users/${userId}/role role=${dto.role}`);
    const result = await this.usersService.updateUserRole(userId, dto);
    return { data: result };
  }

  /**
   * 사용자 일시 정지
   * POST /api/admin/users/:userId/suspend
   */
  @Post(':userId/suspend')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '사용자 일시 정지',
    description: '사용자를 일시 정지합니다. (admin 권한 필요)',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID', example: 'user-001' })
  @ApiResponse({
    status: 200,
    description: '일시 정지 성공',
    type: UserStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async suspendUser(
    @Param('userId') userId: string,
    @Body() dto: SuspendUserDto,
  ): Promise<{ data: UserStatusResponseDto }> {
    this.logger.debug(`POST /api/admin/users/${userId}/suspend`);
    const result = await this.usersService.suspendUser(userId, dto);
    return { data: result };
  }

  /**
   * 사용자 영구 차단
   * POST /api/admin/users/:userId/ban
   */
  @Post(':userId/ban')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '사용자 영구 차단',
    description: '사용자를 영구 차단합니다. (admin 권한 필요)',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID', example: 'user-001' })
  @ApiResponse({
    status: 200,
    description: '영구 차단 성공',
    type: UserStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async banUser(
    @Param('userId') userId: string,
    @Body() dto: BanUserDto,
  ): Promise<{ data: UserStatusResponseDto }> {
    this.logger.debug(`POST /api/admin/users/${userId}/ban`);
    const result = await this.usersService.banUser(userId, dto);
    return { data: result };
  }

  /**
   * 사용자 활성화 (정지/차단 해제)
   * POST /api/admin/users/:userId/activate
   */
  @Post(':userId/activate')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '사용자 활성화',
    description: '정지 또는 차단된 사용자를 활성화합니다. (admin 권한 필요)',
  })
  @ApiParam({ name: 'userId', description: '사용자 ID', example: 'user-001' })
  @ApiResponse({
    status: 200,
    description: '활성화 성공',
    type: UserStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: '사용자를 찾을 수 없음' })
  async activateUser(
    @Param('userId') userId: string,
  ): Promise<{ data: UserStatusResponseDto }> {
    this.logger.debug(`POST /api/admin/users/${userId}/activate`);
    const result = await this.usersService.activateUser(userId);
    return { data: result };
  }
}


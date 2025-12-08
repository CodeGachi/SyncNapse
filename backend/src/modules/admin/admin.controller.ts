import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { CurrentUser } from '../common/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminUserResponseDto } from './dto';

/**
 * Admin Controller
 * Base URL: /api/admin
 * 
 * 모든 엔드포인트는 JWT 인증 + Admin/Operator 역할 필요
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  /**
   * 현재 관리자 사용자 정보 조회
   * GET /api/admin/auth/me
   */
  @Get('auth/me')
  @ApiOperation({
    summary: '현재 관리자 사용자 정보 조회',
    description: 'admin 또는 operator 역할을 가진 사용자의 정보를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '사용자 정보 조회 성공',
    type: AdminUserResponseDto,
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
  async getMe(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: AdminUserResponseDto }> {
    this.logger.debug(`GET /api/admin/auth/me userId=${user.id}`);
    const adminUser = await this.adminService.getCurrentAdminUser(user.id);
    return { data: adminUser };
  }
}


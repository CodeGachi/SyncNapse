import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { AdminService } from './admin.service';
import { AdminUserResponseDto } from './dto';

/**
 * Admin Controller
 * Base URL: /api/admin
 * 
 * 모든 엔드포인트는 JWT 인증 + Admin/Operator 역할 필요
 */
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
  async getMe(
    @CurrentUser() user: { id: string },
  ): Promise<{ data: AdminUserResponseDto }> {
    this.logger.debug(`GET /api/admin/auth/me userId=${user.id}`);
    const adminUser = await this.adminService.getCurrentAdminUser(user.id);
    return { data: adminUser };
  }
}


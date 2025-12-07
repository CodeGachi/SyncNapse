import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto } from './dto/dashboard-stats-response.dto';

/**
 * Dashboard Controller
 * Base URL: /api/admin/dashboard
 * 
 * 대시보드 관련 통계 및 정보 조회
 */
@ApiTags('Admin - Dashboard')
@ApiBearerAuth()
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly dashboardService: DashboardService) {}

  /**
   * 대시보드 통계 조회
   * GET /api/admin/dashboard/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: '대시보드 통계 조회',
    description: '전체 사용자 수, 활성 세션, 오늘 가입자 수 등 주요 통계를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '통계 조회 성공',
    type: DashboardStatsResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 부족 (admin 또는 operator 역할 필요)',
  })
  async getStats(): Promise<{ data: DashboardStatsResponseDto }> {
    this.logger.debug('GET /api/admin/dashboard/stats');
    const stats = await this.dashboardService.getDashboardStats();
    return { data: stats };
  }
}


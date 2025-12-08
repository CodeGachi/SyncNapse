import { Controller, Get, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { DashboardService } from './dashboard.service';
import { DashboardStatsResponseDto, ServerStatusDto } from './dto';

/**
 * Dashboard Controller
 * Base URL: /api/admin/dashboard
 * 
 * 대시보드 관련 통계 및 정보 조회
 */
@ApiTags('Admin')
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

  /**
   * 서버 상태 목록 조회
   * GET /api/admin/dashboard/servers
   */
  @Get('servers')
  @ApiOperation({
    summary: '서버 상태 목록 조회',
    description: 'API 서버, 데이터베이스, 캐시 등 각 서버의 상태를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '서버 상태 조회 성공',
    type: [ServerStatusDto],
  })
  @ApiResponse({
    status: 401,
    description: '인증 실패',
  })
  @ApiResponse({
    status: 403,
    description: '권한 부족 (admin 또는 operator 역할 필요)',
  })
  async getServers(): Promise<{ data: ServerStatusDto[] }> {
    this.logger.debug('GET /api/admin/dashboard/servers');
    const servers = await this.dashboardService.getServers();
    return { data: servers };
  }
}


import { Controller, Get, Param, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { MonitoringService } from './monitoring.service';
import { ServerStatusDto, ServerMetricsQueryDto, ServerMetricsDto } from './dto';

/**
 * Monitoring Controller (Admin)
 * Base URL: /api/admin/servers
 * 
 * 관리자용 서버 모니터링
 */
@ApiTags('Admin - Monitoring')
@ApiBearerAuth()
@Controller('admin/servers')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * 6.1 서버 상태 목록 조회
   * GET /api/admin/servers
   */
  @Get()
  @ApiOperation({
    summary: '서버 상태 목록 조회',
    description: '모든 서버의 상태와 메트릭을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '서버 상태 조회 성공',
    type: [ServerStatusDto],
  })
  async getServers(): Promise<{ data: ServerStatusDto[] }> {
    this.logger.debug('GET /api/admin/servers');
    return await this.monitoringService.getServers();
  }

  /**
   * 6.2 서버 상세 메트릭 조회
   * GET /api/admin/servers/:serverName/metrics
   */
  @Get(':serverName/metrics')
  @ApiParam({
    name: 'serverName',
    description: '서버 이름',
    example: 'Main API Server',
  })
  @ApiOperation({
    summary: '서버 상세 메트릭 조회',
    description: '특정 서버의 시계열 메트릭 데이터를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '서버 메트릭 조회 성공',
    type: ServerMetricsDto,
  })
  @ApiResponse({
    status: 404,
    description: '서버를 찾을 수 없음',
  })
  async getServerMetrics(
    @Param('serverName') serverName: string,
    @Query() query: ServerMetricsQueryDto,
  ): Promise<{ data: ServerMetricsDto }> {
    this.logger.debug(`GET /api/admin/servers/${serverName}/metrics`);
    return await this.monitoringService.getServerMetrics(serverName, query);
  }
}


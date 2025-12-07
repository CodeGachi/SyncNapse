import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { ServerStatusDto, ServerMetricsQueryDto, ServerMetricsDto, MetricPointDto } from './dto';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 6.1 서버 상태 목록 조회
   * GET /api/admin/servers
   * 
   * 참고: DashboardService.getServers()와 유사하지만 별도로 구현
   */
  async getServers(): Promise<{ data: ServerStatusDto[] }> {
    this.logger.debug('getServers');

    try {
      const now = new Date();

      // Mock 데이터
      const servers: ServerStatusDto[] = [
        new ServerStatusDto({
          name: 'Main API Server',
          status: 'healthy',
          responseTime: 45,
          cpu: 35,
          memory: 62,
          connections: 1247,
          storage: null,
          lastCheck: now.toISOString(),
        }),
        new ServerStatusDto({
          name: 'Database Server',
          status: 'healthy',
          responseTime: 12,
          cpu: 28,
          memory: 55,
          connections: 842,
          storage: 68,
          lastCheck: now.toISOString(),
        }),
        new ServerStatusDto({
          name: 'Redis Cache',
          status: 'healthy',
          responseTime: 8,
          cpu: 15,
          memory: 42,
          connections: 523,
          storage: 32,
          lastCheck: now.toISOString(),
        }),
        new ServerStatusDto({
          name: 'AI Service',
          status: 'warning',
          responseTime: 156,
          cpu: 78,
          memory: 85,
          connections: 324,
          storage: null,
          lastCheck: now.toISOString(),
        }),
      ];

      return { data: servers };
    } catch (error) {
      this.logger.error('Failed to get servers', error);
      throw new InternalServerErrorException('서버 상태 조회에 실패했습니다.');
    }
  }

  /**
   * 6.2 서버 상세 메트릭 조회
   * GET /api/admin/servers/:serverName/metrics
   */
  async getServerMetrics(serverName: string, query: ServerMetricsQueryDto): Promise<{ data: ServerMetricsDto }> {
    this.logger.debug(`getServerMetrics serverName=${serverName} period=${query.period}`);

    try {
      const period = query.period || '1h';

      // 유효한 서버 이름 체크
      const validServers = ['Main API Server', 'Database Server', 'Redis Cache', 'AI Service'];
      if (!validServers.includes(serverName)) {
        throw new NotFoundException('서버를 찾을 수 없습니다.');
      }

      // Mock 데이터 생성 (시간에 따라)
      const metrics = this.generateMockMetrics(serverName, period);

      const result = new ServerMetricsDto({
        server: serverName,
        metrics,
      });

      return { data: result };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to get server metrics', error);
      throw new InternalServerErrorException('서버 메트릭 조회에 실패했습니다.');
    }
  }

  /**
   * Mock 메트릭 데이터 생성 헬퍼
   */
  private generateMockMetrics(serverName: string, period: string): MetricPointDto[] {
    const now = new Date();
    const metrics: MetricPointDto[] = [];

    // 기간별 데이터 포인트 개수
    let dataPoints = 12; // 1h (5분 간격)
    let intervalMinutes = 5;

    if (period === '24h') {
      dataPoints = 24; // 24시간 (1시간 간격)
      intervalMinutes = 60;
    } else if (period === '7d') {
      dataPoints = 168; // 7일 (1시간 간격)
      intervalMinutes = 60;
    }

    // 서버별 기본값
    let baseCpu = 30;
    let baseMemory = 60;
    let baseResponseTime = 45;

    if (serverName === 'Database Server') {
      baseCpu = 25;
      baseMemory = 55;
      baseResponseTime = 12;
    } else if (serverName === 'Redis Cache') {
      baseCpu = 15;
      baseMemory = 42;
      baseResponseTime = 8;
    } else if (serverName === 'AI Service') {
      baseCpu = 75;
      baseMemory = 85;
      baseResponseTime = 150;
    }

    // 데이터 생성
    for (let i = dataPoints - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMinutes * 60 * 1000);

      metrics.push({
        timestamp: timestamp.toISOString(),
        cpu: Math.max(0, Math.min(100, baseCpu + this.getRandomVariance(10))),
        memory: Math.max(0, Math.min(100, baseMemory + this.getRandomVariance(8))),
        responseTime: Math.max(1, baseResponseTime + this.getRandomVariance(15)),
      });
    }

    return metrics;
  }

  /**
   * 랜덤 변동값 생성
   */
  private getRandomVariance(range: number): number {
    return Math.floor(Math.random() * range * 2) - range;
  }
}


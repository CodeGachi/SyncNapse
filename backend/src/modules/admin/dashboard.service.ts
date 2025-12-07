import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { DashboardStatsResponseDto, SystemStatus } from './dto/dashboard-stats-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  // 캐싱 (5분)
  private cache: DashboardStatsResponseDto | null = null;
  private cacheExpiry: Date | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5분

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 대시보드 통계 조회
   * GET /api/admin/dashboard/stats
   */
  async getDashboardStats(): Promise<DashboardStatsResponseDto> {
    this.logger.debug('getDashboardStats');

    // 캐시 체크
    const now = new Date();
    if (this.cache && this.cacheExpiry && now < this.cacheExpiry) {
      this.logger.debug('Returning cached dashboard stats');
      return this.cache;
    }

    try {
      // 날짜 계산 (UTC 기준)
      const nowUtc = new Date();
      const oneDayAgo = new Date(nowUtc.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(nowUtc.getTime() - 2 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(nowUtc.getTime() - 30 * 24 * 60 * 60 * 1000);

      const startOfToday = new Date(nowUtc);
      startOfToday.setUTCHours(0, 0, 0, 0);

      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);

      // 모든 쿼리 병렬 실행
      const [
        totalUsers,
        totalUsersThirtyDaysAgo,
        activeUserIds,
        activeUserIdsYesterday,
        todaySignups,
        yesterdaySignups,
      ] = await Promise.all([
        // 1. 현재 전체 사용자 수
        this.prisma.user.count({
          where: { deletedAt: null },
        }),

        // 2. 30일 전까지 가입한 사용자 수 (30일간 증가분 계산용)
        this.prisma.user.count({
          where: {
            deletedAt: null,
            createdAt: { lte: thirtyDaysAgo },
          },
        }),

        // 3. 최근 24시간 활성 사용자 (고유 사용자, 만료되지 않은 토큰만)
        this.prisma.refreshToken.findMany({
          where: {
            createdAt: { gte: oneDayAgo },
            expiresAt: { gte: nowUtc },
            revokedAt: null,
          },
          select: { userId: true },
          distinct: ['userId'],
        }),

        // 4. 24-48시간 전 활성 사용자
        this.prisma.refreshToken.findMany({
          where: {
            createdAt: {
              gte: twoDaysAgo,
              lt: oneDayAgo,
            },
            expiresAt: { gte: oneDayAgo },
            revokedAt: null,
          },
          select: { userId: true },
          distinct: ['userId'],
        }),

        // 5. 오늘 가입자 수
        this.prisma.user.count({
          where: {
            deletedAt: null,
            createdAt: { gte: startOfToday },
          },
        }),

        // 6. 어제 가입자 수
        this.prisma.user.count({
          where: {
            deletedAt: null,
            createdAt: {
              gte: startOfYesterday,
              lt: startOfToday,
            },
          },
        }),
      ]);

      // 활성 세션 수 (고유 사용자 수)
      const activeSessions = activeUserIds.length;
      const activeSessionsYesterday = activeUserIdsYesterday.length;

      // 변화율 계산
      const totalUsersChange = this.calculateChangeRate(
        totalUsersThirtyDaysAgo,
        totalUsers,
      );

      const activeSessionsChange = this.calculateChangeRate(
        activeSessionsYesterday,
        activeSessions,
      );

      const todaySignupsChange = this.calculateChangeRate(
        yesterdaySignups,
        todaySignups,
      );

      // 시스템 상태 판단
      const systemStatus = this.determineSystemStatus({
        totalUsers,
        activeSessions,
        todaySignups,
      });

      const stats = new DashboardStatsResponseDto({
        totalUsers,
        totalUsersChange,
        activeSessions,
        activeSessionsChange,
        todaySignups,
        todaySignupsChange,
        systemStatus,
      });

      // 캐시 저장
      this.cache = stats;
      this.cacheExpiry = new Date(nowUtc.getTime() + this.CACHE_TTL_MS);

      return stats;
    } catch (error) {
      this.logger.error('Failed to get dashboard stats', error);
      throw new InternalServerErrorException('대시보드 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 변화율 계산 (백분율)
   * @param oldValue 이전 값
   * @param newValue 현재 값
   * @returns 변화율 (%)
   */
  private calculateChangeRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }

    const change = ((newValue - oldValue) / oldValue) * 100;
    return Math.round(change * 10) / 10; // 소수점 1자리
  }

  /**
   * 시스템 상태 판단
   * @param stats 통계 데이터
   * @returns 시스템 상태
   */
  private determineSystemStatus(stats: {
    totalUsers: number;
    activeSessions: number;
    todaySignups: number;
  }): SystemStatus {
    // 간단한 휴리스틱:
    // - 활성 세션이 전체 사용자의 5% 미만이면 warning
    // - 활성 세션이 전체 사용자의 2% 미만이면 error
    if (stats.totalUsers > 0) {
      const activeRate = (stats.activeSessions / stats.totalUsers) * 100;

      if (activeRate < 2) {
        return 'error';
      } else if (activeRate < 5) {
        return 'warning';
      }
    }

    return 'healthy';
  }
}


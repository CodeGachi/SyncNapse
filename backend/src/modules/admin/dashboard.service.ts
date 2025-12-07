import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { DashboardStatsResponseDto, SystemStatus } from './dto/dashboard-stats-response.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 대시보드 통계 조회
   * GET /api/admin/dashboard/stats
   */
  async getDashboardStats(): Promise<DashboardStatsResponseDto> {
    this.logger.debug('getDashboardStats');

    // 1. 전체 사용자 수 (deletedAt이 null인 사용자만)
    const totalUsers = await this.prisma.user.count({
      where: { deletedAt: null },
    });

    // 2. 이전 기간 사용자 수 (30일 전 기준)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const totalUsersThirtyDaysAgo = await this.prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { lte: thirtyDaysAgo },
      },
    });

    // 3. 전체 사용자 변화율 계산
    const totalUsersChange = this.calculateChangeRate(
      totalUsersThirtyDaysAgo,
      totalUsers,
    );

    // 4. 활성 세션 수 (최근 24시간 이내 로그인한 사용자)
    // RefreshToken 테이블을 사용하여 추정
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const activeSessions = await this.prisma.refreshToken.count({
      where: {
        createdAt: { gte: oneDayAgo },
      },
    });

    // 5. 이전 기간 활성 세션 수 (24-48시간 전)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const activeSessionsYesterday = await this.prisma.refreshToken.count({
      where: {
        createdAt: {
          gte: twoDaysAgo,
          lt: oneDayAgo,
        },
      },
    });

    const activeSessionsChange = this.calculateChangeRate(
      activeSessionsYesterday,
      activeSessions,
    );

    // 6. 오늘 가입자 수
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todaySignups = await this.prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfToday },
      },
    });

    // 7. 어제 가입자 수
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    const yesterdaySignups = await this.prisma.user.count({
      where: {
        deletedAt: null,
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      },
    });

    const todaySignupsChange = this.calculateChangeRate(
      yesterdaySignups,
      todaySignups,
    );

    // 8. 시스템 상태 판단
    const systemStatus = this.determineSystemStatus({
      totalUsers,
      activeSessions,
      todaySignups,
    });

    return new DashboardStatsResponseDto({
      totalUsers,
      totalUsersChange,
      activeSessions,
      activeSessionsChange,
      todaySignups,
      todaySignupsChange,
      systemStatus,
    });
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


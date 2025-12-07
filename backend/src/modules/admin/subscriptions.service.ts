import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  SubscriptionStatsQueryDto,
  SubscriptionStatsDto,
  RevenueQueryDto,
  RevenueItemDto,
  SubscriptionByPlanDto,
  ChurnAnalysisDto,
  SubscriptionListQueryDto,
  SubscriptionItemDto,
  PlanDistributionDto,
  PaginationDto,
} from './dto';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 5.1 구독 통계 조회
   * GET /api/admin/subscriptions/stats
   */
  async getStats(query: SubscriptionStatsQueryDto): Promise<{ data: SubscriptionStatsDto }> {
    this.logger.debug(`getStats period=${query.period}`);

    try {
      // Mock 데이터
      const stats = new SubscriptionStatsDto({
        totalRevenue: 156789000,
        totalRevenueChange: 15.3,
        subscriberCount: 6818,
        subscriberCountChange: 8.2,
        mrr: 34220000,
        mrrChange: 12.1,
        churnRate: 3.6,
        churnRateChange: -0.5,
        arpu: 5020,
        ltv: 125500,
      });

      return { data: stats };
    } catch (error) {
      this.logger.error('Failed to get subscription stats', error);
      throw new InternalServerErrorException('구독 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 5.2 수익 추이 조회
   * GET /api/admin/subscriptions/revenue
   */
  async getRevenue(query: RevenueQueryDto): Promise<{ data: RevenueItemDto[] }> {
    this.logger.debug(`getRevenue startDate=${query.startDate} endDate=${query.endDate}`);

    try {
      // Mock 데이터 (최근 6개월)
      const revenue: RevenueItemDto[] = [
        {
          date: '2024-06',
          revenue: 28500000,
          subscriptions: 5420,
          newSubscriptions: 420,
          renewals: 4800,
          cancellations: 180,
        },
        {
          date: '2024-07',
          revenue: 30200000,
          subscriptions: 5680,
          newSubscriptions: 460,
          renewals: 5100,
          cancellations: 200,
        },
        {
          date: '2024-08',
          revenue: 32100000,
          subscriptions: 6020,
          newSubscriptions: 510,
          renewals: 5290,
          cancellations: 220,
        },
        {
          date: '2024-09',
          revenue: 33800000,
          subscriptions: 6340,
          newSubscriptions: 550,
          renewals: 5580,
          cancellations: 230,
        },
        {
          date: '2024-10',
          revenue: 35500000,
          subscriptions: 6650,
          newSubscriptions: 590,
          renewals: 5850,
          cancellations: 210,
        },
        {
          date: '2024-11',
          revenue: 37200000,
          subscriptions: 6980,
          newSubscriptions: 620,
          renewals: 6170,
          cancellations: 190,
        },
      ];

      return { data: revenue };
    } catch (error) {
      this.logger.error('Failed to get revenue', error);
      throw new InternalServerErrorException('수익 추이 조회에 실패했습니다.');
    }
  }

  /**
   * 5.3 요금제별 분석
   * GET /api/admin/subscriptions/by-plan
   */
  async getByPlan(): Promise<{ data: SubscriptionByPlanDto[] }> {
    this.logger.debug('getByPlan');

    try {
      // Mock 데이터
      const byPlan: SubscriptionByPlanDto[] = [
        {
          planId: 'plan-student-pro',
          planName: 'Student Pro',
          subscribers: 3856,
          revenue: 19280000,
          change: 12.5,
          percentage: 75.6,
          avgSubscriptionLengthDays: 195,
        },
        {
          planId: 'plan-educator-pro',
          planName: 'Educator Pro',
          subscribers: 1524,
          revenue: 15240000,
          change: 8.3,
          percentage: 18.2,
          avgSubscriptionLengthDays: 220,
        },
      ];

      return { data: byPlan };
    } catch (error) {
      this.logger.error('Failed to get by-plan analysis', error);
      throw new InternalServerErrorException('요금제별 분석 조회에 실패했습니다.');
    }
  }

  /**
   * 5.4 이탈 분석
   * GET /api/admin/subscriptions/churn
   */
  async getChurn(query: SubscriptionStatsQueryDto): Promise<{ data: ChurnAnalysisDto }> {
    this.logger.debug(`getChurn period=${query.period}`);

    try {
      // Mock 데이터
      const churn = new ChurnAnalysisDto({
        totalChurned: 185,
        churnRate: 3.6,
        revenueLost: 1250000,
        reasons: [
          { reason: 'price', label: '가격', count: 65, percentage: 35.1 },
          { reason: 'features', label: '기능 부족', count: 45, percentage: 24.3 },
          { reason: 'quality', label: '서비스 품질', count: 35, percentage: 18.9 },
          { reason: 'not_using', label: '사용하지 않음', count: 25, percentage: 13.5 },
          { reason: 'other', label: '기타', count: 15, percentage: 8.1 },
        ],
        byPlan: [
          { planId: 'plan-student-pro', planName: 'Student Pro', churned: 142, churnRate: 3.7 },
          { planId: 'plan-educator-pro', planName: 'Educator Pro', churned: 43, churnRate: 2.8 },
        ],
      });

      return { data: churn };
    } catch (error) {
      this.logger.error('Failed to get churn analysis', error);
      throw new InternalServerErrorException('이탈 분석 조회에 실패했습니다.');
    }
  }

  /**
   * 5.5 구독 목록 조회
   * GET /api/admin/subscriptions
   */
  async getSubscriptions(query: SubscriptionListQueryDto): Promise<{ data: SubscriptionItemDto[]; pagination: PaginationDto }> {
    this.logger.debug(`getSubscriptions query=${JSON.stringify(query)}`);

    try {
      const { page = 1, limit = 20 } = query;

      if (page < 1 || limit < 1) {
        throw new BadRequestException('잘못된 페이지 파라미터입니다.');
      }

      // Mock 데이터
      const subscriptions: SubscriptionItemDto[] = [
        {
          id: 'sub-001',
          userId: 'user-003',
          userName: '김선생',
          userEmail: 'kim@example.com',
          planId: 'plan-educator-pro',
          planName: 'Educator Pro',
          status: 'active',
          amount: 12000,
          billingCycle: 'monthly',
          currentPeriodStart: '2024-11-01T00:00:00Z',
          currentPeriodEnd: '2024-12-01T00:00:00Z',
          createdAt: '2024-03-15T10:00:00Z',
        },
        {
          id: 'sub-002',
          userId: 'user-005',
          userName: '이학생',
          userEmail: 'lee@example.com',
          planId: 'plan-student-pro',
          planName: 'Student Pro',
          status: 'active',
          amount: 4500,
          billingCycle: 'monthly',
          currentPeriodStart: '2024-11-15T00:00:00Z',
          currentPeriodEnd: '2024-12-15T00:00:00Z',
          createdAt: '2024-01-20T10:00:00Z',
        },
      ];

      const total = 156;
      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const pagination = new PaginationDto({
        page,
        pageSize: limit,
        total,
        totalPages,
      });

      return { data: subscriptions, pagination };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to get subscriptions', error);
      throw new InternalServerErrorException('구독 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 5.6 요금제 분포
   * GET /api/admin/subscriptions/distribution
   */
  async getDistribution(): Promise<{ data: PlanDistributionDto[] }> {
    this.logger.debug('getDistribution');

    try {
      // Mock 데이터
      const distribution: PlanDistributionDto[] = [
        { planId: 'plan-free', planName: '무료 플랜', userCount: 12847, percentage: 71.6 },
        { planId: 'plan-student-pro', planName: 'Student Pro', userCount: 3856, percentage: 21.5 },
        { planId: 'plan-educator-pro', planName: 'Educator Pro', userCount: 1242, percentage: 6.9 },
      ];

      return { data: distribution };
    } catch (error) {
      this.logger.error('Failed to get distribution', error);
      throw new InternalServerErrorException('요금제 분포 조회에 실패했습니다.');
    }
  }
}


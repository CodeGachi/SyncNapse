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
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      // 현재 활성 구독자 수 (status가 'active'이고 cancelledAt이 null)
      const subscriberCount = await this.prisma.subscription.count({
        where: {
          status: 'active',
          cancelledAt: null,
        },
      });

      // 30일 전 활성 구독자 수 (30일 전 시점에 활성 상태였던 구독)
      const subscriberCountThirtyDaysAgo = await this.prisma.subscription.count({
        where: {
          createdAt: { lte: thirtyDaysAgo },
          OR: [
            { cancelledAt: null },
            { cancelledAt: { gt: thirtyDaysAgo } },
          ],
        },
      });

      // 총 수익 (모든 활성 구독의 월간 금액 합계)
      // status가 'active'이고 cancelledAt이 null인 구독만 활성으로 간주
      const activeSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          cancelledAt: null,
        },
        select: { amount: true, billingCycle: true },
      });

      let totalRevenue = 0;
      let mrr = 0; // Monthly Recurring Revenue
      for (const sub of activeSubscriptions) {
        if (sub.billingCycle === 'monthly') {
          totalRevenue += sub.amount * 12; // 연간 수익으로 환산
          mrr += sub.amount;
        } else if (sub.billingCycle === 'yearly') {
          totalRevenue += sub.amount;
          mrr += Math.round(sub.amount / 12); // 연간을 월간으로 환산
        }
      }

      // 30일 전 MRR 계산 (30일 전 시점에 활성 상태였던 구독)
      const subscriptionsThirtyDaysAgo = await this.prisma.subscription.findMany({
        where: {
          createdAt: { lte: thirtyDaysAgo },
          OR: [
            { cancelledAt: null },
            { cancelledAt: { gt: thirtyDaysAgo } },
          ],
        },
        select: { amount: true, billingCycle: true },
      });

      let mrrThirtyDaysAgo = 0;
      for (const sub of subscriptionsThirtyDaysAgo) {
        if (sub.billingCycle === 'monthly') {
          mrrThirtyDaysAgo += sub.amount;
        } else if (sub.billingCycle === 'yearly') {
          mrrThirtyDaysAgo += Math.round(sub.amount / 12);
        }
      }

      // 이탈률 계산 (최근 30일간 취소된 구독)
      const churnedCount = await this.prisma.subscription.count({
        where: {
          status: 'cancelled',
          cancelledAt: { gte: thirtyDaysAgo },
        },
      });

      // 이탈률은 기간 시작 시점의 활성 구독자 수로 나눠야 함
      const churnRate = subscriberCountThirtyDaysAgo > 0
        ? (churnedCount / subscriberCountThirtyDaysAgo) * 100
        : 0;

      // 30-60일 전 이탈자 수
      const churnedCountPrevious = await this.prisma.subscription.count({
        where: {
          status: 'cancelled',
          cancelledAt: {
            gte: sixtyDaysAgo,
            lt: thirtyDaysAgo,
          },
        },
      });

      // ARPU (Average Revenue Per User)
      const arpu = subscriberCount > 0 ? Math.round(mrr / subscriberCount) : 0;

      // LTV (Lifetime Value) - 간단히 ARPU * 평균 구독 기간 (월)로 계산
      // 실제로는 더 복잡한 계산이 필요하지만 데모용으로 단순화
      const avgSubscriptionMonths = 12; // 가정
      const ltv = arpu * avgSubscriptionMonths;

      const stats = new SubscriptionStatsDto({
        totalRevenue,
        totalRevenueChange: this.calculateChangeRate(0, totalRevenue), // 이전 데이터 없으므로 0
        subscriberCount,
        subscriberCountChange: this.calculateChangeRate(subscriberCountThirtyDaysAgo, subscriberCount),
        mrr,
        mrrChange: this.calculateChangeRate(mrrThirtyDaysAgo, mrr),
        churnRate: Math.round(churnRate * 10) / 10,
        churnRateChange: this.calculateChangeRate(churnedCountPrevious, churnedCount),
        arpu,
        ltv,
      });

      return { data: stats };
    } catch (error) {
      this.logger.error('Failed to get subscription stats', error);
      throw new InternalServerErrorException('구독 통계 조회에 실패했습니다.');
    }
  }

  /**
   * 변화율 계산 (백분율)
   */
  private calculateChangeRate(oldValue: number, newValue: number): number {
    if (oldValue === 0) {
      return newValue > 0 ? 100 : 0;
    }
    const change = ((newValue - oldValue) / oldValue) * 100;
    return Math.round(change * 10) / 10;
  }

  /**
   * 5.2 수익 추이 조회
   * GET /api/admin/subscriptions/revenue
   */
  async getRevenue(query: RevenueQueryDto): Promise<{ data: RevenueItemDto[] }> {
    this.logger.debug(`getRevenue startDate=${query.startDate} endDate=${query.endDate}`);

    try {
      const startDate = query.startDate ? new Date(query.startDate) : new Date();
      startDate.setMonth(startDate.getMonth() - 6); // 기본 6개월
      const endDate = query.endDate ? new Date(query.endDate) : new Date();

      // 월별로 그룹화하여 수익 계산
      const revenue: RevenueItemDto[] = [];
      const current = new Date(startDate);
      current.setDate(1); // 월 초일로 설정
      current.setHours(0, 0, 0, 0);

      while (current <= endDate) {
        const monthStart = new Date(current);
        const monthEnd = new Date(current);
        monthEnd.setMonth(monthEnd.getMonth() + 1);
        monthEnd.setDate(0); // 월 말일
        monthEnd.setHours(23, 59, 59, 999);

        // 해당 월 신규 구독
        const newSubscriptions = await this.prisma.subscription.count({
          where: {
            createdAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        });

        // 해당 월 말일 기준 활성 구독 수 (월 말일 시점에 활성 상태였던 구독)
        const subscriptions = await this.prisma.subscription.count({
          where: {
            createdAt: { lte: monthEnd },
            OR: [
              { cancelledAt: null },
              { cancelledAt: { gt: monthEnd } },
            ],
          },
        });

        // 해당 월 취소된 구독
        const cancellations = await this.prisma.subscription.count({
          where: {
            status: 'cancelled',
            cancelledAt: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
        });

        // 해당 월 수익 계산 (월 말일 시점에 활성 상태였던 구독의 월간 금액 합계)
        const activeSubs = await this.prisma.subscription.findMany({
          where: {
            createdAt: { lte: monthEnd },
            OR: [
              { cancelledAt: null },
              { cancelledAt: { gt: monthEnd } },
            ],
          },
          select: { 
            amount: true, 
            billingCycle: true,
            currentPeriodStart: true,
            createdAt: true,
          },
        });

        let monthlyRevenue = 0;
        let renewals = 0;
        for (const sub of activeSubs) {
          if (sub.billingCycle === 'monthly') {
            monthlyRevenue += sub.amount;
            // 갱신: currentPeriodStart가 해당 월에 있고, createdAt이 그보다 이전이면 갱신
            if (
              sub.currentPeriodStart >= monthStart &&
              sub.currentPeriodStart <= monthEnd &&
              sub.createdAt < sub.currentPeriodStart
            ) {
              renewals++;
            }
          } else if (sub.billingCycle === 'yearly') {
            monthlyRevenue += Math.round(sub.amount / 12);
            // 연간 구독도 마찬가지로 갱신 체크
            if (
              sub.currentPeriodStart >= monthStart &&
              sub.currentPeriodStart <= monthEnd &&
              sub.createdAt < sub.currentPeriodStart
            ) {
              renewals++;
            }
          }
        }

        const month = current.getMonth() + 1;
        const dateStr = `${current.getFullYear()}-${month < 10 ? '0' : ''}${month}`;
        revenue.push({
          date: dateStr,
          revenue: monthlyRevenue,
          subscriptions,
          newSubscriptions,
          renewals,
          cancellations,
        });

        current.setMonth(current.getMonth() + 1);
      }

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
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 모든 활성 요금제 조회
      const plans = await this.prisma.plan.findMany({
        where: { status: 'active' },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      // 전체 활성 구독자 수 (루프 밖에서 한 번만 조회)
      const totalSubscribers = await this.prisma.subscription.count({
        where: {
          status: 'active',
          cancelledAt: null,
        },
      });

      // 각 플랜별로 30일 전 구독자 수를 병렬로 조회
      const planIds = plans.map(p => p.id);
      const thirtyDaysAgoCountsPromises = planIds.map(planId =>
        this.prisma.subscription.count({
          where: {
            planId,
            createdAt: { lte: thirtyDaysAgo },
            OR: [
              { cancelledAt: null },
              { cancelledAt: { gt: thirtyDaysAgo } },
            ],
          },
        })
      );

      const thirtyDaysAgoCounts = await Promise.all(thirtyDaysAgoCountsPromises);

      // 각 플랜별로 평균 구독 기간을 병렬로 조회
      const avgLengthPromises = plans.map(plan =>
        plan.subscriptions.length > 0
          ? this.calculateAvgSubscriptionLength(plan.id)
          : Promise.resolve(undefined)
      );

      const avgLengths = await Promise.all(avgLengthPromises);

      // 결과 조합
      const byPlan: SubscriptionByPlanDto[] = plans.map((plan, index) => {
        const subscribers = plan.subscriptions.length;
        const subscribersThirtyDaysAgo = thirtyDaysAgoCounts[index];

        // 수익 계산
        let revenue = 0;
        for (const sub of plan.subscriptions) {
          if (sub.billingCycle === 'monthly') {
            revenue += sub.amount * 12; // 연간 수익으로 환산
          } else if (sub.billingCycle === 'yearly') {
            revenue += sub.amount;
          }
        }

        return {
          planId: plan.id,
          planName: plan.name,
          subscribers,
          revenue,
          change: this.calculateChangeRate(subscribersThirtyDaysAgo, subscribers),
          percentage: totalSubscribers > 0
            ? Math.round((subscribers / totalSubscribers) * 100 * 10) / 10
            : 0,
          avgSubscriptionLengthDays: avgLengths[index],
        };
      });

      return { data: byPlan };
    } catch (error) {
      this.logger.error('Failed to get by-plan analysis', error);
      throw new InternalServerErrorException('요금제별 분석 조회에 실패했습니다.');
    }
  }

  /**
   * 평균 구독 기간 계산 (일 단위)
   */
  private async calculateAvgSubscriptionLength(planId: string): Promise<number> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        planId,
        status: 'active',
        cancelledAt: null,
      },
      select: { createdAt: true },
    });

    if (subscriptions.length === 0) return 0;

    const now = new Date();
    const totalDays = subscriptions.reduce((sum, sub) => {
      const days = Math.floor((now.getTime() - sub.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);

    return Math.round(totalDays / subscriptions.length);
  }

  /**
   * 5.4 이탈 분석
   * GET /api/admin/subscriptions/churn
   */
  async getChurn(query: SubscriptionStatsQueryDto): Promise<{ data: ChurnAnalysisDto }> {
    this.logger.debug(`getChurn period=${query.period}`);

    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 최근 30일간 취소된 구독
      const churnedSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 'cancelled',
          cancelledAt: { gte: thirtyDaysAgo },
        },
        include: { plan: true },
      });

      const totalChurned = churnedSubscriptions.length;

      // 현재 활성 구독자 수 (status가 'active'이고 cancelledAt이 null)
      const activeSubscriptions = await this.prisma.subscription.count({
        where: {
          status: 'active',
          cancelledAt: null,
        },
      });

      // 이탈률 계산
      const churnRate = activeSubscriptions > 0
        ? (totalChurned / activeSubscriptions) * 100
        : 0;

      // 손실 수익 계산
      let revenueLost = 0;
      for (const sub of churnedSubscriptions) {
        if (sub.billingCycle === 'monthly') {
          revenueLost += sub.amount;
        } else if (sub.billingCycle === 'yearly') {
          revenueLost += Math.round(sub.amount / 12);
        }
      }

      // 취소 사유별 집계
      const reasonMap = new Map<string, number>();
      for (const sub of churnedSubscriptions) {
        const reason = sub.cancelReason || 'other';
        reasonMap.set(reason, (reasonMap.get(reason) || 0) + 1);
      }

      const reasons = Array.from(reasonMap.entries()).map(([reason, count]) => ({
        reason,
        label: this.getReasonLabel(reason),
        count,
        percentage: totalChurned > 0 ? Math.round((count / totalChurned) * 100 * 10) / 10 : 0,
      }));

      // 요금제별 이탈 분석
      const planChurnMap = new Map<string, { churned: number; planName: string }>();
      for (const sub of churnedSubscriptions) {
        const key = sub.planId;
        const existing = planChurnMap.get(key) || { churned: 0, planName: sub.plan.name };
        planChurnMap.set(key, {
          churned: existing.churned + 1,
          planName: existing.planName,
        });
      }

      const byPlan = [];
      for (const [planId, data] of planChurnMap.entries()) {
        // 30일 전 시점의 활성 구독자 수로 이탈률 계산
        const planActiveCountThirtyDaysAgo = await this.prisma.subscription.count({
          where: {
            planId,
            createdAt: { lte: thirtyDaysAgo },
            OR: [
              { cancelledAt: null },
              { cancelledAt: { gt: thirtyDaysAgo } },
            ],
          },
        });

        byPlan.push({
          planId,
          planName: data.planName,
          churned: data.churned,
          churnRate: planActiveCountThirtyDaysAgo > 0
            ? Math.round((data.churned / planActiveCountThirtyDaysAgo) * 100 * 10) / 10
            : 0,
        });
      }

      const churn = new ChurnAnalysisDto({
        totalChurned,
        churnRate: Math.round(churnRate * 10) / 10,
        revenueLost,
        reasons,
        byPlan,
      });

      return { data: churn };
    } catch (error) {
      this.logger.error('Failed to get churn analysis', error);
      throw new InternalServerErrorException('이탈 분석 조회에 실패했습니다.');
    }
  }

  /**
   * 취소 사유 라벨 변환
   */
  private getReasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      price: '가격',
      features: '기능 부족',
      quality: '서비스 품질',
      not_using: '사용하지 않음',
      other: '기타',
    };
    return labels[reason] || reason;
  }

  /**
   * 5.5 구독 목록 조회
   * GET /api/admin/subscriptions
   */
  async getSubscriptions(query: SubscriptionListQueryDto): Promise<{ data: SubscriptionItemDto[]; pagination: PaginationDto }> {
    this.logger.debug(`getSubscriptions query=${JSON.stringify(query)}`);

    try {
      const { page = 1, limit = 20, status, planId } = query;

      if (page < 1 || limit < 1) {
        throw new BadRequestException('잘못된 페이지 파라미터입니다.');
      }

      const where: any = {};
      if (status) {
        where.status = status;
      }
      if (planId) {
        where.planId = planId;
      }

      const skip = (page - 1) * limit;

      // 구독 목록과 총 개수 병렬 조회
      const [subscriptions, total] = await Promise.all([
        this.prisma.subscription.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                displayName: true,
              },
            },
            plan: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        }),
        this.prisma.subscription.count({ where }),
      ]);

      const data: SubscriptionItemDto[] = subscriptions.map((sub) => ({
        id: sub.id,
        userId: sub.userId,
        userName: sub.user.displayName,
        userEmail: sub.user.email,
        planId: sub.planId,
        planName: sub.plan.name,
        status: sub.status,
        amount: sub.amount,
        billingCycle: sub.billingCycle,
        currentPeriodStart: sub.currentPeriodStart.toISOString(),
        currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
        createdAt: sub.createdAt.toISOString(),
      }));

      const totalPages = Math.max(Math.ceil(total / limit), 1);
      const pagination = new PaginationDto({
        page,
        pageSize: limit,
        total,
        totalPages,
      });

      return { data, pagination };
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
      // 모든 활성 요금제 조회
      const plans = await this.prisma.plan.findMany({
        where: { status: 'active' },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      // 전체 활성 구독자 수
      const totalSubscribers = await this.prisma.subscription.count({
        where: {
          status: 'active',
          cancelledAt: null,
        },
      });

      const distribution: PlanDistributionDto[] = plans.map((plan) => ({
        planId: plan.id,
        planName: plan.name,
        userCount: plan.subscriptions.length,
        percentage: totalSubscribers > 0
          ? Math.round((plan.subscriptions.length / totalSubscribers) * 100 * 10) / 10
          : 0,
      }));

      return { data: distribution };
    } catch (error) {
      this.logger.error('Failed to get distribution', error);
      throw new InternalServerErrorException('요금제 분포 조회에 실패했습니다.');
    }
  }
}


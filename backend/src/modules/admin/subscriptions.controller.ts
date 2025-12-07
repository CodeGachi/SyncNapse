import { Controller, Get, Query, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminRoleGuard } from './guards';
import { SubscriptionsService } from './subscriptions.service';
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

/**
 * Subscriptions Controller (Admin)
 * Base URL: /api/admin/subscriptions
 * 
 * 관리자용 구독 분석
 */
@ApiTags('Admin - Subscriptions')
@ApiBearerAuth()
@Controller('admin/subscriptions')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class SubscriptionsController {
  private readonly logger = new Logger(SubscriptionsController.name);

  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  /**
   * 5.1 구독 통계 조회
   * GET /api/admin/subscriptions/stats
   */
  @Get('stats')
  @ApiOperation({
    summary: '구독 통계 조회',
    description: '전체 수익, MRR, 이탈률 등 구독 관련 주요 지표를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '구독 통계 조회 성공',
    type: SubscriptionStatsDto,
  })
  async getStats(@Query() query: SubscriptionStatsQueryDto): Promise<{ data: SubscriptionStatsDto }> {
    this.logger.debug('GET /api/admin/subscriptions/stats');
    return await this.subscriptionsService.getStats(query);
  }

  /**
   * 5.2 수익 추이 조회
   * GET /api/admin/subscriptions/revenue
   */
  @Get('revenue')
  @ApiOperation({
    summary: '수익 추이 조회',
    description: '기간별 수익 추이를 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '수익 추이 조회 성공',
    type: [RevenueItemDto],
  })
  async getRevenue(@Query() query: RevenueQueryDto): Promise<{ data: RevenueItemDto[] }> {
    this.logger.debug('GET /api/admin/subscriptions/revenue');
    return await this.subscriptionsService.getRevenue(query);
  }

  /**
   * 5.3 요금제별 분석
   * GET /api/admin/subscriptions/by-plan
   */
  @Get('by-plan')
  @ApiOperation({
    summary: '요금제별 분석',
    description: '각 요금제의 구독자 수, 수익 등을 분석합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '요금제별 분석 성공',
    type: [SubscriptionByPlanDto],
  })
  async getByPlan(): Promise<{ data: SubscriptionByPlanDto[] }> {
    this.logger.debug('GET /api/admin/subscriptions/by-plan');
    return await this.subscriptionsService.getByPlan();
  }

  /**
   * 5.4 이탈 분석
   * GET /api/admin/subscriptions/churn
   */
  @Get('churn')
  @ApiOperation({
    summary: '이탈 분석',
    description: '이탈률, 이탈 사유 등을 분석합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '이탈 분석 성공',
    type: ChurnAnalysisDto,
  })
  async getChurn(@Query() query: SubscriptionStatsQueryDto): Promise<{ data: ChurnAnalysisDto }> {
    this.logger.debug('GET /api/admin/subscriptions/churn');
    return await this.subscriptionsService.getChurn(query);
  }

  /**
   * 5.5 구독 목록 조회
   * GET /api/admin/subscriptions
   */
  @Get()
  @ApiOperation({
    summary: '구독 목록 조회',
    description: '전체 구독 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '구독 목록 조회 성공',
  })
  async getSubscriptions(
    @Query() query: SubscriptionListQueryDto,
  ): Promise<{ data: SubscriptionItemDto[]; pagination: PaginationDto }> {
    this.logger.debug('GET /api/admin/subscriptions');
    return await this.subscriptionsService.getSubscriptions(query);
  }

  /**
   * 5.6 요금제 분포
   * GET /api/admin/subscriptions/distribution
   */
  @Get('distribution')
  @ApiOperation({
    summary: '요금제 분포 조회',
    description: '각 요금제의 사용자 수와 비율을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '요금제 분포 조회 성공',
    type: [PlanDistributionDto],
  })
  async getDistribution(): Promise<{ data: PlanDistributionDto[] }> {
    this.logger.debug('GET /api/admin/subscriptions/distribution');
    return await this.subscriptionsService.getDistribution();
  }
}


import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn, IsInt, Min, IsDateString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 5.1 구독 통계 Query
 */
export class SubscriptionStatsQueryDto {
  @ApiProperty({ description: '기간', enum: ['1m', '3m', '6m', '1y'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['1m', '3m', '6m', '1y'])
  period?: string;
}

/**
 * 5.1 구독 통계 응답
 */
export class SubscriptionStatsDto {
  @ApiProperty({ description: '총 수익 (원)', example: 156789000 })
  totalRevenue!: number;

  @ApiProperty({ description: '총 수익 변화율 (%)', example: 15.3 })
  totalRevenueChange!: number;

  @ApiProperty({ description: '구독자 수', example: 6818 })
  subscriberCount!: number;

  @ApiProperty({ description: '구독자 수 변화율 (%)', example: 8.2 })
  subscriberCountChange!: number;

  @ApiProperty({ description: 'MRR (월간 반복 수익)', example: 34220000 })
  mrr!: number;

  @ApiProperty({ description: 'MRR 변화율 (%)', example: 12.1 })
  mrrChange!: number;

  @ApiProperty({ description: '이탈률 (%)', example: 3.6 })
  churnRate!: number;

  @ApiProperty({ description: '이탈률 변화 (%p)', example: -0.5 })
  churnRateChange!: number;

  @ApiProperty({ description: '평균 사용자당 수익 (ARPU)', example: 5020 })
  arpu!: number;

  @ApiProperty({ description: '고객 생애 가치 (LTV)', example: 125500 })
  ltv!: number;

  constructor(partial: Partial<SubscriptionStatsDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 5.2 수익 추이 Query
 */
export class RevenueQueryDto {
  @ApiProperty({ description: '시작일', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '종료일', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '단위', enum: ['daily', 'weekly', 'monthly'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['daily', 'weekly', 'monthly'])
  granularity?: string;
}

/**
 * 5.2 수익 추이 항목
 */
export class RevenueItemDto {
  @ApiProperty({ description: '날짜', example: '2024-06' })
  date!: string;

  @ApiProperty({ description: '수익 (원)', example: 28500000 })
  revenue!: number;

  @ApiProperty({ description: '구독 수', example: 5420 })
  subscriptions!: number;

  @ApiProperty({ description: '신규 구독', example: 420 })
  newSubscriptions!: number;

  @ApiProperty({ description: '갱신', example: 4800 })
  renewals!: number;

  @ApiProperty({ description: '취소', example: 180 })
  cancellations!: number;
}

/**
 * 5.3 요금제별 분석 항목
 */
export class SubscriptionByPlanDto {
  @ApiProperty({ description: '요금제 ID', example: 'plan-student-pro' })
  planId!: string;

  @ApiProperty({ description: '요금제 이름', example: 'Student Pro' })
  planName!: string;

  @ApiProperty({ description: '구독자 수', example: 3856 })
  subscribers!: number;

  @ApiProperty({ description: '수익 (원)', example: 19280000 })
  revenue!: number;

  @ApiProperty({ description: '변화율 (%)', example: 12.5 })
  change!: number;

  @ApiProperty({ description: '비율 (%)', example: 75.6 })
  percentage!: number;

  @ApiProperty({ description: '평균 구독 기간 (일)', example: 195, required: false })
  avgSubscriptionLengthDays?: number;
}

/**
 * 5.4 이탈 분석 - 이유별
 */
export class ChurnReasonDto {
  @ApiProperty({ description: '이유 코드', example: 'price' })
  reason!: string;

  @ApiProperty({ description: '이유 라벨', example: '가격' })
  label!: string;

  @ApiProperty({ description: '건수', example: 65 })
  count!: number;

  @ApiProperty({ description: '비율 (%)', example: 35.1 })
  percentage!: number;
}

/**
 * 5.4 이탈 분석 - 요금제별
 */
export class ChurnByPlanDto {
  @ApiProperty({ description: '요금제 ID', example: 'plan-student-pro' })
  planId!: string;

  @ApiProperty({ description: '요금제 이름', example: 'Student Pro' })
  planName!: string;

  @ApiProperty({ description: '이탈 건수', example: 142 })
  churned!: number;

  @ApiProperty({ description: '이탈률 (%)', example: 3.7 })
  churnRate!: number;
}

/**
 * 5.4 이탈 분석 응답
 */
export class ChurnAnalysisDto {
  @ApiProperty({ description: '총 이탈 건수', example: 185 })
  totalChurned!: number;

  @ApiProperty({ description: '이탈률 (%)', example: 3.6 })
  churnRate!: number;

  @ApiProperty({ description: '손실 수익 (원)', example: 1250000 })
  revenueLost!: number;

  @ApiProperty({ description: '이유별 분석', type: [ChurnReasonDto] })
  reasons!: ChurnReasonDto[];

  @ApiProperty({ description: '요금제별 분석', type: [ChurnByPlanDto] })
  byPlan!: ChurnByPlanDto[];

  constructor(partial: Partial<ChurnAnalysisDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 5.5 구독 목록 Query
 */
export class SubscriptionListQueryDto {
  @ApiProperty({ description: '페이지', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '페이지당 항목 수', required: false, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: '상태 필터', enum: ['active', 'cancelled', 'past_due'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'cancelled', 'past_due'])
  status?: string;

  @ApiProperty({ description: '요금제 필터', required: false })
  @IsOptional()
  @IsString()
  planId?: string;
}

/**
 * 5.5 구독 목록 항목
 */
export class SubscriptionItemDto {
  @ApiProperty({ description: '구독 ID', example: 'sub-001' })
  id!: string;

  @ApiProperty({ description: '사용자 ID', example: 'user-003' })
  userId!: string;

  @ApiProperty({ description: '사용자 이름', example: '김선생' })
  userName!: string;

  @ApiProperty({ description: '사용자 이메일', example: 'kim@example.com' })
  userEmail!: string;

  @ApiProperty({ description: '요금제 ID', example: 'plan-educator-pro' })
  planId!: string;

  @ApiProperty({ description: '요금제 이름', example: 'Educator Pro' })
  planName!: string;

  @ApiProperty({ description: '상태', example: 'active' })
  status!: string;

  @ApiProperty({ description: '금액 (원)', example: 12000 })
  amount!: number;

  @ApiProperty({ description: '결제 주기', example: 'monthly' })
  billingCycle!: string;

  @ApiProperty({ description: '현재 기간 시작', example: '2024-11-01T00:00:00Z' })
  currentPeriodStart!: string;

  @ApiProperty({ description: '현재 기간 종료', example: '2024-12-01T00:00:00Z' })
  currentPeriodEnd!: string;

  @ApiProperty({ description: '생성일', example: '2024-01-01T00:00:00Z' })
  createdAt!: string;
}

/**
 * 5.6 구독 취소 요청
 */
export class CancelSubscriptionDto {
  @ApiProperty({ description: '취소 사유', example: 'price' })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({ description: '사유 상세', required: false })
  @IsOptional()
  @IsString()
  reasonDetail?: string;
}


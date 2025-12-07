import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 요금제 기능
 */
export class PlanFeatureDto {
  @ApiProperty({ description: '기능 키', example: 'notes' })
  @IsString()
  key!: string;

  @ApiProperty({ description: '기능 이름', example: '노트 생성' })
  @IsString()
  name!: string;

  @ApiProperty({ description: '활성화 여부', example: true })
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty({ description: '제한 값', example: 10, required: false })
  @IsOptional()
  @IsNumber()
  limit?: number | null;

  @ApiProperty({ description: '단위', example: '개', required: false })
  @IsOptional()
  @IsString()
  unit?: string | null;
}

/**
 * 요금제 목록 항목
 */
export class PlanDto {
  @ApiProperty({ description: '요금제 ID', example: 'plan-free' })
  id!: string;

  @ApiProperty({ description: '요금제 이름', example: '무료 플랜' })
  name!: string;

  @ApiProperty({ description: '요금제 설명', example: '제한된 기능으로...' })
  description!: string;

  @ApiProperty({ description: '월간 가격 (원)', example: 0 })
  monthlyPrice!: number;

  @ApiProperty({ description: '연간 가격 (원)', example: 0 })
  yearlyPrice!: number;

  @ApiProperty({ description: '상태', enum: ['active', 'inactive', 'deprecated'], example: 'active' })
  status!: string;

  @ApiProperty({ description: '기능 목록', type: [PlanFeatureDto] })
  features!: PlanFeatureDto[];

  @ApiProperty({ description: '구독자 수', example: 12847 })
  subscriberCount!: number;

  @ApiProperty({ description: '생성일', example: '2024-01-01T00:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '수정일', example: '2024-11-15T10:00:00Z' })
  updatedAt!: string;

  constructor(partial: Partial<PlanDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 요금제 생성 요청
 */
export class CreatePlanDto {
  @ApiProperty({ description: '요금제 이름', example: 'Enterprise' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: '요금제 설명', example: '기업용 플랜' })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({ description: '월간 가격 (원)', example: 50000 })
  @IsNumber()
  monthlyPrice!: number;

  @ApiProperty({ description: '연간 가격 (원)', example: 500000 })
  @IsNumber()
  yearlyPrice!: number;

  @ApiProperty({ description: '상태', enum: ['active', 'inactive'], example: 'active' })
  @IsString()
  @IsIn(['active', 'inactive'])
  status!: string;

  @ApiProperty({ description: '기능 목록', type: [PlanFeatureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  features!: PlanFeatureDto[];
}

/**
 * 요금제 수정 요청
 */
export class UpdatePlanDto {
  @ApiProperty({ description: '요금제 이름', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '요금제 설명', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '월간 가격 (원)', required: false })
  @IsOptional()
  @IsNumber()
  monthlyPrice?: number;

  @ApiProperty({ description: '연간 가격 (원)', required: false })
  @IsOptional()
  @IsNumber()
  yearlyPrice?: number;

  @ApiProperty({ description: '상태', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'deprecated'])
  status?: string;

  @ApiProperty({ description: '기능 목록', type: [PlanFeatureDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlanFeatureDto)
  features?: PlanFeatureDto[];
}

/**
 * 요금제 변경 이력 항목
 */
export class PlanChangeDto {
  @ApiProperty({ description: '변경된 필드', example: 'monthlyPrice' })
  field!: string;

  @ApiProperty({ description: '이전 값', example: 4500 })
  oldValue!: any;

  @ApiProperty({ description: '새 값', example: 5000 })
  newValue!: any;
}

/**
 * 요금제 변경 이력
 */
export class PlanHistoryDto {
  @ApiProperty({ description: '이력 ID', example: 'history-001' })
  id!: string;

  @ApiProperty({ description: '요금제 ID', example: 'plan-student-pro' })
  planId!: string;

  @ApiProperty({ description: '변경한 사용자 ID', example: 'user-001' })
  changedBy!: string;

  @ApiProperty({ description: '변경한 사용자 이름', example: '관리자' })
  changedByName!: string;

  @ApiProperty({ description: '변경 내역', type: [PlanChangeDto] })
  changes!: PlanChangeDto[];

  @ApiProperty({ description: '변경일', example: '2024-11-01T09:00:00Z' })
  createdAt!: string;

  constructor(partial: Partial<PlanHistoryDto>) {
    Object.assign(this, partial);
  }
}


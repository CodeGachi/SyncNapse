import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

/**
 * 6.1 서버 상태 목록 조회 응답 (재사용: 2.2와 동일)
 */
export class ServerStatusDto {
  @ApiProperty({ description: '서버 이름', example: 'Main API Server' })
  name!: string;

  @ApiProperty({ description: '상태', example: 'healthy', enum: ['healthy', 'warning', 'error'] })
  status!: string;

  @ApiProperty({ description: '응답 시간 (ms)', example: 45 })
  responseTime!: number;

  @ApiProperty({ description: 'CPU 사용률 (%)', example: 35 })
  cpu!: number;

  @ApiProperty({ description: '메모리 사용률 (%)', example: 62 })
  memory!: number;

  @ApiProperty({ description: '활성 연결 수', example: 1247 })
  connections!: number;

  @ApiProperty({ description: '스토리지 사용률 (%)', example: 45, nullable: true })
  storage!: number | null;

  @ApiProperty({ description: '마지막 확인 시각', example: '2024-12-01T10:30:00Z' })
  lastCheck!: string;

  constructor(partial: Partial<ServerStatusDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 6.2 서버 메트릭 Query
 */
export class ServerMetricsQueryDto {
  @ApiProperty({ description: '기간', enum: ['1h', '24h', '7d'], required: false })
  @IsOptional()
  @IsString()
  @IsIn(['1h', '24h', '7d'])
  period?: string;
}

/**
 * 6.2 서버 메트릭 항목
 */
export class MetricPointDto {
  @ApiProperty({ description: '타임스탬프', example: '2024-12-01T10:00:00Z' })
  timestamp!: string;

  @ApiProperty({ description: 'CPU 사용률 (%)', example: 32 })
  cpu!: number;

  @ApiProperty({ description: '메모리 사용률 (%)', example: 60 })
  memory!: number;

  @ApiProperty({ description: '응답 시간 (ms)', example: 43 })
  responseTime!: number;
}

/**
 * 6.2 서버 메트릭 응답
 */
export class ServerMetricsDto {
  @ApiProperty({ description: '서버 이름', example: 'Main API Server' })
  server!: string;

  @ApiProperty({ description: '메트릭 데이터', type: [MetricPointDto] })
  metrics!: MetricPointDto[];

  constructor(partial: Partial<ServerMetricsDto>) {
    Object.assign(this, partial);
  }
}


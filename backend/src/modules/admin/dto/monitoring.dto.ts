import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsIn } from 'class-validator';

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


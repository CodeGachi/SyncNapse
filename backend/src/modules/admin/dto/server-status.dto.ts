import { ApiProperty } from '@nestjs/swagger';
import { SystemStatus } from './dashboard-stats-response.dto';

/**
 * 서버 상태 응답 DTO
 * GET /api/admin/dashboard/servers
 */
export class ServerStatusDto {
  @ApiProperty({
    description: '서버 이름',
    example: 'Main API Server',
  })
  name!: string;

  @ApiProperty({
    description: '서버 상태',
    enum: ['healthy', 'warning', 'error'],
    example: 'healthy',
  })
  status!: SystemStatus;

  @ApiProperty({
    description: '응답 시간 (ms)',
    example: 45,
  })
  responseTime!: number;

  @ApiProperty({
    description: 'CPU 사용률 (%)',
    example: 35,
  })
  cpu!: number;

  @ApiProperty({
    description: '메모리 사용률 (%)',
    example: 62,
  })
  memory!: number;

  @ApiProperty({
    description: '연결 수 (API 서버의 경우)',
    example: 1247,
    required: false,
  })
  connections?: number;

  @ApiProperty({
    description: '스토리지 사용률 (%, 데이터베이스의 경우)',
    example: 45,
    required: false,
  })
  storage?: number;

  @ApiProperty({
    description: '마지막 체크 시간',
    example: '2024-12-01T10:30:00Z',
  })
  lastCheck!: string;

  constructor(partial: Partial<ServerStatusDto>) {
    Object.assign(this, partial);
  }
}


import { ApiProperty } from '@nestjs/swagger';

/**
 * 시스템 상태
 */
export type SystemStatus = 'healthy' | 'warning' | 'error';

/**
 * 대시보드 통계 응답 DTO
 * GET /api/admin/dashboard/stats
 */
export class DashboardStatsResponseDto {
  @ApiProperty({
    description: '전체 사용자 수',
    example: 17948,
  })
  totalUsers!: number;

  @ApiProperty({
    description: '전체 사용자 수 변화율 (%)',
    example: 12.5,
  })
  totalUsersChange!: number;

  @ApiProperty({
    description: '활성 세션 수',
    example: 1247,
  })
  activeSessions!: number;

  @ApiProperty({
    description: '활성 세션 수 변화율 (%)',
    example: 8.3,
  })
  activeSessionsChange!: number;

  @ApiProperty({
    description: '오늘 가입자 수',
    example: 156,
  })
  todaySignups!: number;

  @ApiProperty({
    description: '오늘 가입자 수 변화율 (%)',
    example: -2.1,
  })
  todaySignupsChange!: number;

  @ApiProperty({
    description: '시스템 상태',
    enum: ['healthy', 'warning', 'error'],
    example: 'healthy',
  })
  systemStatus!: SystemStatus;

  constructor(partial: Partial<DashboardStatsResponseDto>) {
    Object.assign(this, partial);
  }
}


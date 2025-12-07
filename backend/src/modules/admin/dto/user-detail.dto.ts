import { ApiProperty } from '@nestjs/swagger';

/**
 * 사용자 통계 정보
 */
export class UserStatsDto {
  @ApiProperty({ description: '노트 수', example: 156 })
  notesCount!: number;

  @ApiProperty({ description: '세션 참여 수', example: 89 })
  sessionsCount!: number;

  @ApiProperty({ description: '총 사용 시간 (시간)', example: 245.5 })
  totalUsageHours!: number;

  @ApiProperty({ description: '스토리지 사용량 (MB)', example: 1250 })
  storageUsedMb!: number;

  constructor(partial: Partial<UserStatsDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 최근 활동
 */
export class RecentActivityDto {
  @ApiProperty({ description: '활동 ID', example: 'act-001' })
  id!: string;

  @ApiProperty({
    description: '활동 타입',
    enum: ['login', 'note_create', 'session_join', 'file_upload'],
    example: 'login',
  })
  type!: string;

  @ApiProperty({ description: '활동 설명', example: '로그인' })
  description!: string;

  @ApiProperty({ description: '생성일', example: '2024-12-01T09:30:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '추가 메타데이터', example: {} })
  metadata!: Record<string, any>;

  constructor(partial: Partial<RecentActivityDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 사용자 상세 정보
 */
export class UserDetailDto {
  @ApiProperty({ description: '사용자 ID', example: 'user-001' })
  id!: string;

  @ApiProperty({ description: '이메일', example: 'user@example.com' })
  email!: string;

  @ApiProperty({ description: '이름', example: '홍길동' })
  name!: string;

  @ApiProperty({ description: '프로필 사진 URL', required: false })
  picture?: string;

  @ApiProperty({ description: '역할', example: 'user' })
  role!: string;

  @ApiProperty({ description: '상태', example: 'active' })
  status!: string;

  @ApiProperty({ description: '가입일', example: '2024-01-15T10:00:00Z' })
  createdAt!: string;

  @ApiProperty({ description: '마지막 로그인', required: false })
  lastLoginAt?: string;

  @ApiProperty({ description: '사용자 통계', type: UserStatsDto })
  stats!: UserStatsDto;

  @ApiProperty({ description: '최근 활동 목록', type: [RecentActivityDto] })
  recentActivities!: RecentActivityDto[];

  constructor(partial: Partial<UserDetailDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 사용자 상세 응답
 */
export class UserDetailResponseDto {
  @ApiProperty({ description: '사용자 상세 정보', type: UserDetailDto })
  data!: UserDetailDto;

  constructor(partial: Partial<UserDetailResponseDto>) {
    Object.assign(this, partial);
  }
}


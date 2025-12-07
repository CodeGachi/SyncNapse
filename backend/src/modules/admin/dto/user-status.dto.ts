import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsDateString } from 'class-validator';

/**
 * 사용자 일시 정지 요청 DTO
 * POST /api/admin/users/:userId/suspend
 */
export class SuspendUserDto {
  @ApiProperty({
    description: '정지 사유',
    example: '이용약관 위반',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @ApiProperty({
    description: '정지 종료일 (ISO 8601)',
    example: '2024-12-15T00:00:00Z',
  })
  @IsDateString()
  suspendUntil!: string;
}

/**
 * 사용자 영구 차단 요청 DTO
 * POST /api/admin/users/:userId/ban
 */
export class BanUserDto {
  @ApiProperty({
    description: '차단 사유',
    example: '반복적인 이용약관 위반',
  })
  @IsString()
  @IsNotEmpty()
  reason!: string;
}

/**
 * 사용자 상태 변경 응답 DTO
 */
export class UserStatusResponseDto {
  @ApiProperty({ description: '사용자 ID', example: 'user-001' })
  id!: string;

  @ApiProperty({ description: '상태', example: 'suspended' })
  status!: string;

  @ApiProperty({ description: '정지 종료일', required: false })
  suspendedUntil?: string | null;

  @ApiProperty({ description: '차단 사유', required: false })
  banReason?: string | null;

  constructor(partial: Partial<UserStatusResponseDto>) {
    Object.assign(this, partial);
  }
}


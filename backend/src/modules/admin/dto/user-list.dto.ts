import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 사용자 목록 조회 Query DTO
 */
export class UserListQueryDto {
  @ApiProperty({
    description: '페이지 번호',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 20,
    required: false,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: '역할 필터',
    enum: ['admin', 'operator', 'user'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'operator', 'user'])
  role?: string;

  @ApiProperty({
    description: '상태 필터',
    enum: ['active', 'inactive', 'suspended', 'banned'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['active', 'inactive', 'suspended', 'banned'])
  status?: string;

  @ApiProperty({
    description: '이름/이메일 검색',
    required: false,
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: '정렬 기준',
    enum: ['createdAt', 'lastLoginAt', 'name'],
    required: false,
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'lastLoginAt', 'name'])
  sortBy?: string = 'createdAt';

  @ApiProperty({
    description: '정렬 방향',
    enum: ['asc', 'desc'],
    required: false,
    default: 'desc',
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: string = 'desc';
}

/**
 * 페이지네이션 정보
 */
export class PaginationDto {
  @ApiProperty({ description: '현재 페이지', example: 1 })
  page!: number;

  @ApiProperty({ description: '페이지당 항목 수', example: 20 })
  pageSize!: number;

  @ApiProperty({ description: '전체 항목 수', example: 17948 })
  total!: number;

  @ApiProperty({ description: '전체 페이지 수', example: 898 })
  totalPages!: number;

  constructor(partial: Partial<PaginationDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 구독 정보 (간략)
 */
export class UserSubscriptionDto {
  @ApiProperty({ description: '플랜 ID', required: false })
  planId?: string;

  @ApiProperty({ description: '플랜 이름', required: false })
  planName?: string;

  @ApiProperty({ description: '구독 상태', required: false })
  status?: string;
}

/**
 * 사용자 목록 항목
 */
export class UserListItemDto {
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

  @ApiProperty({ description: '정지 종료일', required: false })
  suspendedUntil?: string | null;

  @ApiProperty({ description: '차단 사유', required: false })
  banReason?: string | null;

  @ApiProperty({ description: '구독 정보', type: UserSubscriptionDto, required: false })
  subscription?: UserSubscriptionDto;

  constructor(partial: Partial<UserListItemDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 사용자 목록 응답
 */
export class UserListResponseDto {
  @ApiProperty({ description: '사용자 목록', type: [UserListItemDto] })
  data!: UserListItemDto[];

  @ApiProperty({ description: '페이지네이션 정보', type: PaginationDto })
  pagination!: PaginationDto;

  constructor(partial: Partial<UserListResponseDto>) {
    Object.assign(this, partial);
  }
}


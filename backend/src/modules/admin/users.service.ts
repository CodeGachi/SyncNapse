import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  UserListQueryDto,
  UserListResponseDto,
  UserListItemDto,
  PaginationDto,
} from './dto/user-list.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 사용자 목록 조회
   * GET /api/admin/users
   */
  async getUsers(query: UserListQueryDto): Promise<UserListResponseDto> {
    this.logger.debug(`getUsers query=${JSON.stringify(query)}`);

    try {
      const {
        page = 1,
        limit = 20,
        role,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = query;

      // Where 조건 구성
      const where: any = {
        deletedAt: null, // 삭제되지 않은 사용자만
      };

      // 역할 필터
      if (role) {
        where.role = role;
      }

      // 상태 필터 (현재는 간단하게 구현, 추후 확장 가능)
      if (status === 'inactive') {
        // 30일 이상 로그인하지 않은 사용자
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        where.refreshTokens = {
          none: {
            createdAt: { gte: thirtyDaysAgo },
          },
        };
      }
      // TODO: suspended, banned 상태는 해당 필드 추가 시 구현

      // 검색 (이름 또는 이메일)
      if (search) {
        where.OR = [
          { displayName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      // 정렬 설정
      const orderBy: any = {};
      if (sortBy === 'name') {
        orderBy.displayName = sortOrder;
      } else {
        // lastLoginAt은 필드가 없으므로 createdAt 사용
        orderBy.createdAt = sortOrder;
      }

      // 페이지네이션 계산
      const skip = (page - 1) * limit;

      // 병렬로 데이터와 총 개수 조회
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          orderBy,
          skip,
          take: limit,
          select: {
            id: true,
            email: true,
            displayName: true,
            role: true,
            createdAt: true,
            refreshTokens: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { createdAt: true },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      // DTO 변환
      const data = users.map((user) => {
        const lastLogin = user.refreshTokens[0]?.createdAt;
        const status = this.determineUserStatus(lastLogin);

        return new UserListItemDto({
          id: user.id,
          email: user.email,
          name: user.displayName,
          picture: undefined, // TODO: profilePictureUrl 필드 추가 시
          role: user.role,
          status,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: lastLogin?.toISOString(),
          suspendedUntil: null, // TODO: 필드 추가 시
          banReason: null, // TODO: 필드 추가 시
          subscription: undefined, // TODO: 구독 테이블 연동 시
        });
      });

      // 페이지네이션 정보
      const totalPages = Math.ceil(total / limit);
      const pagination = new PaginationDto({
        page,
        pageSize: limit,
        total,
        totalPages,
      });

      return new UserListResponseDto({ data, pagination });
    } catch (error) {
      this.logger.error('Failed to get users', error);
      throw new InternalServerErrorException('사용자 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 사용자 상태 판단
   */
  private determineUserStatus(lastLoginAt: Date | null | undefined): string {
    // TODO: banReason, suspendedUntil 필드 추가 시 구현

    if (!lastLoginAt) {
      return 'inactive';
    }

    // 30일 이상 로그인하지 않은 경우
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (lastLoginAt < thirtyDaysAgo) {
      return 'inactive';
    }

    return 'active';
  }
}


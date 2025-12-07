import { Injectable, Logger, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  UserListQueryDto,
  UserListResponseDto,
  UserListItemDto,
  PaginationDto,
  UserDetailResponseDto,
  UserDetailDto,
  UserStatsDto,
  RecentActivityDto,
} from './dto';

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

      // 안전성 체크
      if (page < 1 || limit < 1) {
        throw new InternalServerErrorException('잘못된 페이지 파라미터입니다.');
      }

      // Where 조건 구성 (AND로 안전하게 결합)
      const where: any = {
        deletedAt: null,
      };

      const andConditions: any[] = [];

      // 역할 필터
      if (role) {
        andConditions.push({ role });
      }

      // 상태 필터
      if (status === 'inactive') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        andConditions.push({
          refreshTokens: {
            none: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        });
      }
      // TODO: suspended, banned 상태는 해당 필드 추가 시 구현

      // 검색 (이름 또는 이메일) - OR 조건은 별도로
      if (search) {
        andConditions.push({
          OR: [
            { displayName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        });
      }

      // AND 조건 적용
      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      // 정렬 설정
      const orderBy: any = {};
      if (sortBy === 'name') {
        orderBy.displayName = sortOrder;
      } else {
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
      const totalPages = Math.max(Math.ceil(total / limit), 1);
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

  /**
   * 사용자 상세 조회
   * GET /api/admin/users/:userId
   */
  async getUserDetail(userId: string): Promise<UserDetailResponseDto> {
    this.logger.debug(`getUserDetail userId=${userId}`);

    try {
      // 사용자 기본 정보 조회
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          createdAt: true,
          deletedAt: true,
          refreshTokens: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { createdAt: true },
          },
        },
      });

      if (!user || user.deletedAt) {
        throw new NotFoundException('사용자를 찾을 수 없습니다.');
      }

      // 통계 정보 병렬 조회
      const [foldersCount, uploadsCount, uploadsSize, auditLogsCount] = await Promise.all([
        // 노트 수 (Folder 수로 대체)
        this.prisma.folder.count({
          where: {
            userId,
            deletedAt: null,
          },
        }),

        // 업로드 파일 수
        this.prisma.upload.count({
          where: {
            userId,
          },
        }),

        // 스토리지 사용량 (bytes → MB)
        this.prisma.upload.aggregate({
          where: {
            userId,
          },
          _sum: {
            totalSizeBytes: true,
          },
        }),

        // 활동 수 (AuditLog 수)
        this.prisma.auditLog.count({
          where: { userId },
        }),
      ]);

      // 최근 활동 조회 (최근 10개)
      const recentAuditLogs = await this.prisma.auditLog.findMany({
        where: { userId },
        orderBy: { at: 'desc' },
        take: 10,
        select: {
          id: true,
          method: true,
          path: true,
          at: true,
        },
      });

      // 상태 판단
      const lastLogin = user.refreshTokens[0]?.createdAt;
      const status = this.determineUserStatus(lastLogin);

      // 스토리지 MB 변환
      const storageMb = uploadsSize._sum?.totalSizeBytes
        ? Math.round(uploadsSize._sum.totalSizeBytes / (1024 * 1024))
        : 0;

      // 통계 생성
      const stats = new UserStatsDto({
        notesCount: foldersCount,
        sessionsCount: auditLogsCount, // 세션 수는 활동 수로 대체
        totalUsageHours: 0, // TODO: 실제 사용 시간 추적 시 구현
        storageUsedMb: storageMb,
      });

      // 최근 활동 변환
      const recentActivities = recentAuditLogs.map((log) => {
        const type = this.determineActivityType(log.method, log.path);
        const description = this.getActivityDescription(type, log.method, log.path);

        return new RecentActivityDto({
          id: log.id,
          type,
          description,
          createdAt: log.at.toISOString(),
          metadata: {
            method: log.method,
            path: log.path,
          },
        });
      });

      // 상세 정보 생성
      const detail = new UserDetailDto({
        id: user.id,
        email: user.email,
        name: user.displayName,
        picture: undefined, // TODO: profilePictureUrl 필드 추가 시
        role: user.role,
        status,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: lastLogin?.toISOString(),
        stats,
        recentActivities,
      });

      return new UserDetailResponseDto({ data: detail });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to get user detail', error);
      throw new InternalServerErrorException('사용자 상세 조회에 실패했습니다.');
    }
  }

  /**
   * 활동 타입 판단
   */
  private determineActivityType(method: string | null, path: string | null): string {
    if (!method || !path) return 'login';

    if (path.includes('/auth/')) return 'login';
    if (path.includes('/folders') && method === 'POST') return 'note_create';
    if (path.includes('/upload')) return 'file_upload';
    if (path.includes('/sessions')) return 'session_join';

    return 'login';
  }

  /**
   * 활동 설명 생성
   */
  private getActivityDescription(type: string, method: string | null, path: string | null): string {
    switch (type) {
      case 'login':
        return '로그인';
      case 'note_create':
        return '노트 생성';
      case 'file_upload':
        return '파일 업로드';
      case 'session_join':
        return '세션 참여';
      default:
        return `${method} ${path}`;
    }
  }
}


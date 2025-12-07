import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { AdminUserResponseDto } from './dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 현재 관리자/운영자 사용자 정보 조회
   * GET /api/admin/auth/me
   */
  async getCurrentAdminUser(userId: string): Promise<AdminUserResponseDto> {
    this.logger.debug(`getCurrentAdminUser userId=${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    if (user.deletedAt) {
      throw new NotFoundException('삭제된 사용자입니다.');
    }

    // 권한 확인 (admin 또는 operator만 허용)
    if (!['admin', 'operator'].includes(user.role)) {
      throw new NotFoundException('관리자 권한이 없습니다.');
    }

    return new AdminUserResponseDto({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
  }
}


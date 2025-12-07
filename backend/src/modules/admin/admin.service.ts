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
   * 
   * Note: 권한 체크는 AdminRoleGuard에서 이미 수행됨
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

    if (!user || user.deletedAt) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return new AdminUserResponseDto({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
    });
  }
}


import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { isInAdminRoles, RequestUser, AdminErrors } from '../constants';
import { PrismaService } from '../../db/prisma.service';

/**
 * Admin Role Guard
 * admin 또는 operator 역할을 가진 사용자만 접근 가능
 * 
 * 사용처:
 * - 대시보드 조회
 * - 사용자 목록 조회
 * - 요금제 목록 조회
 * - 구독 통계 조회
 * - 서버 상태 조회
 */
@Injectable()
export class AdminRoleGuard implements CanActivate {
  private readonly logger = new Logger(AdminRoleGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      this.logger.warn('AdminRoleGuard: No user found in request');
      throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
    }

    // If role is not already loaded, fetch it from database
    if (!user.role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      if (!dbUser) {
        this.logger.warn(`AdminRoleGuard: User not found in database - user=${user.id}`);
        throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
      }

      // Enrich request user with role
      user.role = dbUser.role || 'user';
    }

    const hasAccess = user.role && isInAdminRoles(user.role);

    if (!hasAccess) {
      this.logger.warn(
        `AdminRoleGuard: Access denied - user=${user.id} role=${user.role}`,
      );
      throw new ForbiddenException(AdminErrors.ADMIN_ROLE_REQUIRED.message);
    }

    this.logger.debug(`AdminRoleGuard: Access granted - user=${user.id}`);
    return true;
  }
}


import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { isInAdminOnly, RequestUser, AdminErrors } from '../constants';
import { PrismaService } from '../../db/prisma.service';

/**
 * Admin Only Guard
 * admin 역할만 접근 가능 (operator 불가)
 * 
 * 사용처:
 * - 사용자 역할 변경
 * - 사용자 영구 차단
 * - 요금제 생성/수정/삭제
 * - 시스템 설정 변경
 */
@Injectable()
export class AdminOnlyGuard implements CanActivate {
  private readonly logger = new Logger(AdminOnlyGuard.name);

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user) {
      this.logger.warn('AdminOnlyGuard: No user found in request');
      throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
    }

    // If role is not already loaded, fetch it from database
    if (!user.role) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { role: true },
      });

      if (!dbUser) {
        this.logger.warn(`AdminOnlyGuard: User not found in database - user=${user.id}`);
        throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
      }

      // Enrich request user with role
      user.role = dbUser.role || 'user';
    }

    const hasAccess = user.role && isInAdminOnly(user.role);

    if (!hasAccess) {
      this.logger.warn(
        `AdminOnlyGuard: Access denied - user=${user.id} role=${user.role}`,
      );
      throw new ForbiddenException(AdminErrors.ADMIN_ONLY_REQUIRED.message);
    }

    this.logger.debug(`AdminOnlyGuard: Access granted - user=${user.id}`);
    return true;
  }
}


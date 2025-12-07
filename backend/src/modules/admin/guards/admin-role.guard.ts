import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ADMIN_ROLES } from '../constants';

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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role?: string } | undefined;

    if (!user) {
      this.logger.warn('AdminRoleGuard: No user found in request');
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const hasAccess = user.role && ADMIN_ROLES.includes(user.role as any);

    this.logger.debug(
      `AdminRoleGuard: user=${user.id} role=${user.role} hasAccess=${hasAccess}`,
    );

    if (!hasAccess) {
      throw new ForbiddenException('관리자 권한이 필요합니다.');
    }

    return true;
  }
}


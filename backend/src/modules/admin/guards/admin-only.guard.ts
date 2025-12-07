import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ADMIN_ONLY } from '../constants';

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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; role?: string } | undefined;

    if (!user) {
      this.logger.warn('AdminOnlyGuard: No user found in request');
      throw new ForbiddenException('인증이 필요합니다.');
    }

    const hasAccess = user.role && ADMIN_ONLY.includes(user.role as any);

    this.logger.debug(
      `AdminOnlyGuard: user=${user.id} role=${user.role} hasAccess=${hasAccess}`,
    );

    if (!hasAccess) {
      throw new ForbiddenException('최고 관리자 권한이 필요합니다.');
    }

    return true;
  }
}


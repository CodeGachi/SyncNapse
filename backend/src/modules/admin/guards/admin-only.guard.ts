import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { isInAdminOnly, RequestUser, AdminErrors } from '../constants';

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
    const user = request.user as RequestUser | undefined;

    if (!user) {
      this.logger.warn('AdminOnlyGuard: No user found in request');
      throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
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


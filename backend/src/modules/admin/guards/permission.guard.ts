import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, hasPermission, RequestUser, AdminErrors } from '../constants';

/**
 * Permission Metadata Key
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Permissions Decorator
 * 특정 권한이 필요한 엔드포인트에 사용
 * 
 * @example
 * @Permissions(Permission.USER_DELETE)
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * async deleteUser() { ... }
 */
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Permission Guard
 * 세밀한 권한 체크
 * 
 * @Permissions 데코레이터와 함께 사용
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // 권한 요구사항이 없으면 통과
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser | undefined;

    if (!user || !user.role) {
      this.logger.warn('PermissionGuard: No user or role found in request');
      throw new ForbiddenException(AdminErrors.AUTHENTICATION_REQUIRED.message);
    }

    // 모든 필요한 권한을 가지고 있는지 확인
    const hasAllPermissions = requiredPermissions.every((permission) =>
      hasPermission(user.role!, permission),
    );

    if (!hasAllPermissions) {
      this.logger.warn(
        `PermissionGuard: Access denied - user=${user.id} role=${user.role} required=${requiredPermissions.join(',')}`,
      );
      throw new ForbiddenException(AdminErrors.INSUFFICIENT_PERMISSIONS.message);
    }

    this.logger.debug(
      `PermissionGuard: Access granted - user=${user.id} permissions=${requiredPermissions.join(',')}`,
    );
    return true;
  }
}


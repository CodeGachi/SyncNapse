import { CanActivate, ExecutionContext, Injectable, Logger, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
    private readonly logger = new Logger(RolesGuard.name);
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [handler, classRef]) ?? [];
    if (requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    const has = !!user && !!user.role && requiredRoles.includes(user.role);
    this.logger.debug(`RolesGuard roles=${JSON.stringify(requiredRoles)} userRole=${user?.role ?? 'none'} allow=${has}`);
    return has;
    }
}

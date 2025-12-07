import { UserRole } from './roles';

/**
 * Permission Types
 * 권한 타입 정의
 */
export enum Permission {
  // User Management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',

  // Plan Management
  PLAN_READ = 'plan:read',
  PLAN_WRITE = 'plan:write',
  PLAN_DELETE = 'plan:delete',

  // Subscription Management
  SUBSCRIPTION_READ = 'subscription:read',
  SUBSCRIPTION_WRITE = 'subscription:write',

  // Server Monitoring
  SERVER_READ = 'server:read',

  // System Settings
  SETTINGS_READ = 'settings:read',
  SETTINGS_WRITE = 'settings:write',

  // Dashboard
  DASHBOARD_READ = 'dashboard:read',
}

/**
 * Role-based Permission Mapping
 * 역할별 권한 매핑
 * 
 * admin: 모든 권한
 * operator: 조회 및 제한적인 수정 권한 (삭제, 설정 변경 불가)
 * user: 권한 없음
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.PLAN_READ,
    Permission.PLAN_WRITE,
    Permission.PLAN_DELETE,
    Permission.SUBSCRIPTION_READ,
    Permission.SUBSCRIPTION_WRITE,
    Permission.SERVER_READ,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_WRITE,
    Permission.DASHBOARD_READ,
  ],
  [UserRole.OPERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.PLAN_READ,
    Permission.SUBSCRIPTION_READ,
    Permission.SERVER_READ,
    Permission.DASHBOARD_READ,
  ],
  [UserRole.USER]: [],
};

/**
 * Get permissions by role
 * 역할에 따른 권한 목록 반환
 */
export const getPermissionsByRole = (role: string): string[] => {
  return ROLE_PERMISSIONS[role as UserRole] || [];
};

/**
 * Check if user has permission
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export const hasPermission = (
  userRole: string,
  permission: Permission,
): boolean => {
  const permissions = getPermissionsByRole(userRole);
  return permissions.includes(permission);
};


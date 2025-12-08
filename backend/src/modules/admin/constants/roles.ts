/**
 * User Role Enum
 * 사용자 역할 정의
 * 
 * 프론트엔드 타입과 동기화:
 * - frontend/src/lib/api/types/admin.types.ts
 * - UserRole = "user" | "operator" | "admin"
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  USER = 'user',
}

/**
 * User Status Enum
 * 사용자 상태 정의 (프론트엔드와 동기화)
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

/**
 * 관리자 페이지 접근 가능한 역할
 * (admin + operator)
 */
export const ADMIN_ROLES: readonly UserRole[] = [
  UserRole.ADMIN,
  UserRole.OPERATOR,
] as const;

/**
 * Admin 전용 역할
 * (operator는 접근 불가)
 */
export const ADMIN_ONLY: readonly UserRole[] = [UserRole.ADMIN] as const;

/**
 * 역할 확인 헬퍼 함수
 */
export const isAdminRole = (role: string): boolean => {
  return role === UserRole.ADMIN || role === UserRole.OPERATOR;
};

export const isAdminOnly = (role: string): boolean => {
  return role === UserRole.ADMIN;
};

/**
 * 배열 포함 여부 확인 (타입 안전)
 */
export const isInAdminRoles = (role: string): boolean => {
  return ADMIN_ROLES.some((adminRole) => adminRole === role);
};

export const isInAdminOnly = (role: string): boolean => {
  return ADMIN_ONLY.some((adminRole) => adminRole === role);
};


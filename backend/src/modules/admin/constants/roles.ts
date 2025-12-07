/**
 * User Role Enum
 * 사용자 역할 정의
 */
export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  USER = 'user',
}

/**
 * 관리자 페이지 접근 가능한 역할
 * (admin + operator)
 */
export const ADMIN_ROLES = [UserRole.ADMIN, UserRole.OPERATOR] as const;

/**
 * Admin 전용 역할
 * (operator는 접근 불가)
 */
export const ADMIN_ONLY = [UserRole.ADMIN] as const;

/**
 * 역할 확인 헬퍼 함수
 */
export const isAdminRole = (role: string): boolean => {
  return ADMIN_ROLES.includes(role as UserRole);
};

export const isAdminOnly = (role: string): boolean => {
  return role === UserRole.ADMIN;
};


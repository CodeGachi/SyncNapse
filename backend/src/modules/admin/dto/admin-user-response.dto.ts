/**
 * Admin User Response DTO
 * 관리자 API에서 사용자 정보를 반환할 때 사용
 */
export class AdminUserResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];

  constructor(data: {
    id: string;
    email: string;
    displayName: string;
    role: string;
  }) {
    this.id = data.id;
    this.email = data.email;
    this.name = data.displayName;
    this.role = data.role;
    this.permissions = this.getPermissionsByRole(data.role);
  }

  /**
   * 역할에 따른 권한 목록 반환
   */
  private getPermissionsByRole(role: string): string[] {
    const permissionMap: Record<string, string[]> = {
      admin: [
        'user:read',
        'user:write',
        'user:delete',
        'plan:read',
        'plan:write',
        'plan:delete',
        'subscription:read',
        'subscription:write',
        'server:read',
        'settings:read',
        'settings:write',
        'dashboard:read',
      ],
      operator: [
        'user:read',
        'user:write',
        'plan:read',
        'subscription:read',
        'server:read',
        'dashboard:read',
      ],
      user: [],
    };

    return permissionMap[role] || [];
  }
}


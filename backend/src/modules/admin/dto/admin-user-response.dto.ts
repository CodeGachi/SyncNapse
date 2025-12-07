import { getPermissionsByRole } from '../constants';

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
    this.permissions = getPermissionsByRole(data.role);
  }
}

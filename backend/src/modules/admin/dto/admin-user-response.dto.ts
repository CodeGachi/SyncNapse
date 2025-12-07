import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, IsArray, IsEnum } from 'class-validator';
import { getPermissionsByRole, UserRole } from '../constants';

/**
 * Admin User Response DTO
 * 관리자 API에서 사용자 정보를 반환할 때 사용
 */
export class AdminUserResponseDto {
  @ApiProperty({
    description: '사용자 ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: '사용자 이메일',
    example: 'admin@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '사용자 이름',
    example: '관리자',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: '사용자 역할',
    enum: UserRole,
    example: UserRole.ADMIN,
  })
  @IsEnum(UserRole)
  role: string;

  @ApiProperty({
    description: '사용자 권한 목록',
    example: ['user:read', 'user:write', 'plan:read'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
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

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

/**
 * 사용자 역할 변경 요청 DTO
 */
export class UpdateUserRoleDto {
  @ApiProperty({
    description: '변경할 역할',
    enum: ['admin', 'operator', 'user'],
    example: 'operator',
  })
  @IsString()
  @IsIn(['admin', 'operator', 'user'])
  role!: string;
}

/**
 * 사용자 역할 변경 응답 DTO
 */
export class UpdateUserRoleResponseDto {
  @ApiProperty({ description: '사용자 ID', example: 'user-001' })
  id!: string;

  @ApiProperty({ description: '변경된 역할', example: 'operator' })
  role!: string;

  constructor(partial: Partial<UpdateUserRoleResponseDto>) {
    Object.assign(this, partial);
  }
}


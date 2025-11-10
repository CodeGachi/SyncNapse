import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'user-123', description: 'User ID' })
  id!: string;

  @ApiProperty({ example: 'user@example.com', description: 'User email' })
  email!: string;

  @ApiProperty({ example: 'John Doe', description: 'Display name' })
  displayName!: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin'], description: 'User role' })
  role!: string;

  @ApiProperty({ example: 'oauth:google', description: 'Authentication provider' })
  authProvider!: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z', description: 'Account creation date' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z', description: 'Last update date' })
  updatedAt!: Date;
}
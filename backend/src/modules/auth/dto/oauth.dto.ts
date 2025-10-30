import { ApiProperty } from '@nestjs/swagger';

export class OAuthCallbackResponseDto {
  @ApiProperty({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiaWF0IjoxNjE2MjM5MDIyfQ...',
  })
  accessToken!: string;

  @ApiProperty({
    description: 'Refresh token for obtaining new access tokens',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLWlkIiwiaWF0IjoxNjE2MjM5MDIyfQ...',
  })
  refreshToken!: string;

  @ApiProperty({
    description: 'Access token expiration time in seconds',
    example: 900,
  })
  expiresIn!: number;

  @ApiProperty({
    description: 'Token type (always "Bearer")',
    example: 'Bearer',
  })
  tokenType!: string;

  @ApiProperty({
    description: 'HATEOAS links for navigation',
    example: {
      self: { href: '/api/auth/google/callback', method: 'GET' },
      me: { href: '/api/users/me', method: 'GET' },
      refresh: { href: '/api/auth/refresh', method: 'POST' },
      logout: { href: '/api/auth/logout', method: 'POST' },
    },
  })
  _links!: Record<string, unknown>;
}
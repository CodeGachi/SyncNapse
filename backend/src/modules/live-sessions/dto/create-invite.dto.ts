import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateInviteDto {
  @ApiPropertyOptional({ description: 'Role for invited users (listener/presenter)', default: 'listener' })
  @IsString()
  @IsOptional()
  role?: string;

  @ApiPropertyOptional({ description: 'Maximum number of uses (null = unlimited)', default: null })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Expiration time in minutes from now', default: 120 })
  @IsInt()
  @Min(1)
  @IsOptional()
  expiresInMinutes?: number;
}


import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class JoinSessionDto {
  @ApiPropertyOptional({ description: 'Display name for the user (optional)' })
  @IsString()
  @IsOptional()
  displayName?: string;
}


import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateInviteDto {
  @ApiProperty({ description: 'Expiration date/time for the invite' })
  @IsDateString()
  expiresAt!: string;

  @ApiPropertyOptional({ description: 'Maximum number of uses (null = unlimited)' })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;
}


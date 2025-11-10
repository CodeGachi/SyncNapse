import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookmarkDto {
  @ApiProperty({ description: 'Start time in seconds (decimal)', example: 123.45, minimum: 0 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  startSec!: number;

  @ApiPropertyOptional({ description: 'Optional tag for categorization', example: 'important', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  tag?: string;

  @ApiPropertyOptional({ description: 'Optional comment or note', example: 'Review this section', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}


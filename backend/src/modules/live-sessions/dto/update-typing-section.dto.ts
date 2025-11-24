import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class UpdateTypingSectionDto {
  @ApiPropertyOptional({ description: 'Title of the typing section' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Content of the typing section' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: 'Start time in seconds' })
  @IsNumber()
  @IsOptional()
  startSec?: number;

  @ApiPropertyOptional({ description: 'End time in seconds' })
  @IsNumber()
  @IsOptional()
  endSec?: number;
}


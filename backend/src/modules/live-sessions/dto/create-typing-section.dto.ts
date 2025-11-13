import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsNumber, IsOptional } from 'class-validator';

export class CreateTypingSectionDto {
  @ApiProperty({ description: 'Session ID this typing section belongs to' })
  @IsUUID()
  sessionId!: string;

  @ApiProperty({ description: 'Note ID to attach typing section to' })
  @IsUUID()
  noteId!: string;

  @ApiProperty({ description: 'Title of the typing section' })
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Content of the typing section' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Start time in seconds' })
  @IsNumber()
  @IsOptional()
  startSec?: number;

  @ApiPropertyOptional({ description: 'End time in seconds' })
  @IsNumber()
  @IsOptional()
  endSec?: number;

  @ApiPropertyOptional({ description: 'Chunk ID' })
  @IsUUID()
  @IsOptional()
  chunkId?: string;
}


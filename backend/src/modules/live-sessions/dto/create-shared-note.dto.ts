import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsIn, IsNumber, IsOptional } from 'class-validator';

export class CreateSharedNoteDto {
  @ApiProperty({ description: 'Note ID to share' })
  @IsUUID()
  noteId!: string;

  @ApiProperty({ description: 'Sync mode: LINK or COPY', enum: ['LINK', 'COPY'] })
  @IsString()
  @IsIn(['LINK', 'COPY'])
  mode!: 'LINK' | 'COPY';

  @ApiPropertyOptional({ description: 'Start time in seconds' })
  @IsNumber()
  @IsOptional()
  startSec?: number;

  @ApiPropertyOptional({ description: 'End time in seconds' })
  @IsNumber()
  @IsOptional()
  endSec?: number;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsNumber()
  @IsOptional()
  pageNumber?: number;
}


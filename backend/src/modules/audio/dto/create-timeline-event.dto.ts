import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimelineEventDto {
  @ApiProperty({ description: 'Timestamp in seconds (relative to audio start)' })
  @IsNumber()
  timestamp!: number;

  @ApiProperty({ description: 'File ID being viewed', required: false })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiProperty({ description: 'Page number being viewed', required: false })
  @IsOptional()
  @IsInt()
  pageNumber?: number;
}


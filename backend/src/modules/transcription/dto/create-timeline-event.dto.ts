import { IsString, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTimelineEventDto {
  @ApiProperty({ description: 'Audio recording ID to attach event to' })
  @IsString()
  @IsNotEmpty()
  recordingId!: string;

  @ApiProperty({ description: 'Timestamp in audio (seconds)' })
  @IsNumber()
  @IsNotEmpty()
  timestamp!: number;

  @ApiProperty({ description: 'File ID being viewed', required: false })
  @IsOptional()
  @IsString()
  fileId?: string;

  @ApiProperty({ description: 'Page number being viewed', required: false })
  @IsOptional()
  @IsNumber()
  pageNumber?: number;
}


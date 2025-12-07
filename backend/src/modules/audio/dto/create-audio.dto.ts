import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAudioRecordingDto {
  @ApiProperty({ description: 'Note ID to attach recording to' })
  @IsString()
  noteId!: string;

  @ApiProperty({ description: 'Recording title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Duration in seconds', required: false })
  @IsOptional()
  @IsNumber()
  durationSec?: number;
}


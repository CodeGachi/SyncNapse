import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Word-level timestamp information
export class TranscriptWordDto {
  @IsString()
  @IsNotEmpty()
  word!: string;

  @IsNumber()
  startTime!: number;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsNumber()
  wordIndex!: number;
}

// Save transcript segment with optional word-level timestamps
export class SaveTranscriptDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsNumber()
  startTime!: number;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  isPartial?: boolean;

  @IsString()
  @IsOptional()
  language?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TranscriptWordDto)
  @IsOptional()
  words?: TranscriptWordDto[];
}

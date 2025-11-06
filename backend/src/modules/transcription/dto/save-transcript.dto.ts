import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional } from 'class-validator';

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
  endTime!: number;

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsBoolean()
  @IsOptional()
  isPartial?: boolean;

  @IsString()
  @IsOptional()
  language?: string;
}

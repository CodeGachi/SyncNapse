import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class SaveAudioChunkDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsNumber()
  chunkIndex!: number;

  @IsNumber()
  startTime!: number;

  @IsNumber()
  endTime!: number;

  @IsNumber()
  duration!: number;

  @IsNumber()
  sampleRate!: number;

  @IsString()
  @IsNotEmpty()
  audioUrl!: string;
}

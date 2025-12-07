import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

// Save full audio file for a transcription session
export class SaveFullAudioDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @IsString()
  @IsNotEmpty()
  audioUrl!: string; // Base64 encoded audio data URL

  @IsNumber()
  duration!: number; // Total duration in seconds
}

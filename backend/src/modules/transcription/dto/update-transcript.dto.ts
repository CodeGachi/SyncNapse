import { IsString, IsNotEmpty, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTranscriptDto {
  @ApiProperty({ description: 'Session ID' })
  @IsString()
  @IsNotEmpty()
  sessionId!: string;

  @ApiProperty({ description: 'Full transcript content (JSON or text)' })
  @IsNotEmpty()
  content!: any;
}


import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateLiveSessionDto {
  @ApiProperty({ description: 'Note ID to share in the session' })
  @IsUUID()
  noteId!: string;

  @ApiPropertyOptional({ description: 'Session title' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: 'Liveblocks room ID' })
  @IsString()
  @IsOptional()
  liveblocksRoomId?: string;
}


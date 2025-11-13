import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class FinalizeSessionDto {
  @ApiProperty({ description: 'Title for the student\'s finalized note' })
  @IsString()
  noteTitle!: string;

  @ApiPropertyOptional({ description: 'Folder ID to save the finalized note' })
  @IsString()
  @IsOptional()
  folderId?: string;
}


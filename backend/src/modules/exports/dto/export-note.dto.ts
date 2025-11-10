import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ExportNoteParamsDto {
  @ApiProperty({ 
    example: 'note-123', 
    description: 'Note ID to export' 
  })
  @IsString()
  @IsNotEmpty()
  noteId!: string;
}
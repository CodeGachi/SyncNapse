import { ApiProperty } from '@nestjs/swagger';

export class ExportResultDto {
  @ApiProperty({ 
    example: '/path/to/exports/note-123.json', 
    description: 'Path to generated export file' 
  })
  file!: string;

  @ApiProperty({ 
    example: 1024, 
    description: 'File size in bytes',
    required: false 
  })
  size?: number;

  @ApiProperty({ 
    example: '2025-01-15T10:30:00.000Z', 
    description: 'Export generation timestamp',
    required: false 
  })
  generatedAt?: Date;
}

export class ExportPayloadDto {
  @ApiProperty({ example: 'note-123', description: 'Note ID' })
  id!: string;

  @ApiProperty({ example: 'Lecture on AI', description: 'Note title' })
  title!: string;

  @ApiProperty({ description: 'Creation date' })
  createdAt!: Date;

  @ApiProperty({ example: 100, description: 'Number of transcript segments' })
  transcriptSegments!: number;

  @ApiProperty({ example: 50, description: 'Number of translation segments' })
  translationSegments!: number;

  @ApiProperty({ example: 10, description: 'Number of typing sections' })
  typingSections!: number;

  @ApiProperty({ example: 1705318200000, description: 'Export generation timestamp (epoch)' })
  generatedAt!: number;
}
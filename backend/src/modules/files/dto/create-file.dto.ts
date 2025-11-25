import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFileDto {
  @ApiProperty({ description: 'Note ID to attach file to' })
  @IsString()
  noteId!: string;

  @ApiProperty({ description: 'File MIME type', required: false })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiProperty({ description: 'File size in bytes', required: false })
  @IsOptional()
  @IsInt()
  fileSize?: number;
}

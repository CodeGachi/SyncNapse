import { IsString, IsInt, IsJSON, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SavePageContentDto {
  @ApiProperty({ description: 'ID of the file this page belongs to' })
  @IsString()
  fileId!: string;

  @ApiProperty({ description: 'Page number (1-based)' })
  @IsInt()
  pageNumber!: number;

  @ApiProperty({ description: 'Content in Delta format (JSON string or object)' })
  @IsOptional()
  content: any;

  @ApiProperty({ description: 'Expected version for optimistic locking', required: false })
  @IsOptional()
  @IsNumber()
  expectedVersion?: number;
}


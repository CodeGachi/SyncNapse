import { IsString, IsInt, IsArray, IsOptional, IsNumber, ValidateNested, IsIn, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { NoteBlockType } from './note-content.dto';

const VALID_BLOCK_TYPES: NoteBlockType[] = [
  'text', 'heading1', 'heading2', 'heading3',
  'bullet', 'numbered', 'code', 'strikethrough',
  'checkbox', 'toggle', 'divider', 'quote'
];

// Block DTO matching NoteBlock interface from note-content.dto
export class NoteBlockDto {
  @IsString()
  id!: string;

  @IsString()
  content!: string;

  @IsString()
  @IsIn(VALID_BLOCK_TYPES)
  type!: NoteBlockType;

  @IsOptional()
  @IsNumber()
  indent?: number;

  @IsOptional()
  @IsString()
  listType?: string;

  @IsOptional()
  @IsNumber()
  listIndex?: number;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsArray()
  children?: string[];

  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  @IsOptional()
  @IsBoolean()
  expanded?: boolean;

  @IsOptional()
  @IsString()
  linkedTranscriptSegmentId?: string;

  @IsOptional()
  @IsNumber()
  linkedTimestamp?: number;

  @IsOptional()
  @IsObject()
  audioLink?: {
    recordingId: string;
    recordingTitle?: string;
    startTime: number;
    endTime?: number;
  };
}

export class SavePageContentDto {
  @IsString()
  noteId!: string;

  @IsInt()
  pageNumber!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteBlockDto)
  blocks!: NoteBlockDto[];
}

export class GetPageContentDto {
  @IsString()
  noteId!: string;

  @IsInt()
  pageNumber!: number;
}


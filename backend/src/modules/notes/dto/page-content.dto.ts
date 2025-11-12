import { IsString, IsInt, IsArray, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// Block interface matching frontend
export class NoteBlockDto {
  @IsString()
  id!: string;

  @IsString()
  content!: string;

  @IsString()
  type!: string;

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
  isVisible?: boolean;

  @IsOptional()
  children?: string[];
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


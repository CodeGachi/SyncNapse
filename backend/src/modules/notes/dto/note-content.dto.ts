import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export interface NoteBlock {
  id: string;
  content: string;
  type: string;
  indent?: number;
  listType?: string;
  listIndex?: number;
  isVisible?: boolean;
  children?: string[];
}

export interface PageBlocks {
  blocks: NoteBlock[];
}

export interface NoteContentPages {
  [pageNumber: string]: PageBlocks;
}

export class SaveNoteContentDto {
  @IsString()
  @IsNotEmpty()
  noteId!: string;

  @IsObject()
  @IsNotEmpty()
  pages!: NoteContentPages;
}


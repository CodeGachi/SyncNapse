import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export type NoteBlockType =
  | 'text'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'code'
  | 'strikethrough'
  | 'checkbox'
  | 'toggle'
  | 'divider'
  | 'quote';

export interface AudioLink {
  recordingId: string;      // Recording's ID (from DB)
  recordingTitle?: string;  // Recording title (for UI display)
  startTime: number;        // Block creation start time (seconds from recording start)
  endTime?: number;         // Block creation end time (optional)
}

export interface NoteBlock {
  id: string;
  content: string;
  type: NoteBlockType;
  indent?: number;
  listType?: string;
  listIndex?: number;
  isVisible?: boolean;
  children?: string[];
  checked?: boolean; // For checkbox type
  expanded?: boolean; // For toggle type
  linkedTranscriptSegmentId?: string; // Legacy: For audio linking
  linkedTimestamp?: number; // Legacy: For audio linking (seconds)
  audioLink?: AudioLink; // New: For typing-audio sync
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


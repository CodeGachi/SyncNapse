import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ChatMode {
  QUESTION = 'question',
  SUMMARY = 'summary',
  QUIZ = 'quiz',
}

export class ChatRequestDto {
  @IsString()
  lectureNoteId!: string;

  @IsString()
  question!: string;

  @IsOptional()
  @IsEnum(ChatMode)
  mode?: ChatMode;
}

export interface Citation {
  pageNumber?: number;
  startSec?: number;
  endSec?: number;
  score?: number;
  text?: string;
}

export class ChatResponseDto {
  answer!: string;
  citations?: Citation[];
}


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

// 퀴즈 문제 구조
export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export class ChatResponseDto {
  answer!: string;
  citations?: Citation[];
  // 퀴즈 모드일 때 구조화된 퀴즈 데이터
  quiz?: QuizQuestion[];
}


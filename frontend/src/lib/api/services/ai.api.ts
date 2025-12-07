/**
 * AI 챗봇 API 클라이언트
 * RAG 기반 AI 챗봇과 통신하는 API 함수들
 */

import { apiClient } from "../client";

export type ChatMode = "question" | "summary" | "quiz";

export interface ChatRequest {
  lectureNoteId: string;
  question: string;
  mode?: ChatMode;
}

export interface Citation {
  pageNumber?: number;
  startSec?: number;
  endSec?: number;
  score?: number;
  text?: string;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChatResponse {
  answer: string;
  citations?: Citation[];
  quiz?: QuizQuestion[];
}

export interface AiHealthResponse {
  status: string;
  geminiConfigured: boolean;
}

/**
 * AI 챗봇과 대화하기
 * POST /api/ai/chat
 */
export async function chatWithAi(params: ChatRequest): Promise<ChatResponse> {
  return apiClient<ChatResponse>("/ai/chat", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * AI 서비스 헬스 체크
 * GET /api/ai/health
 */
export async function checkAiHealth(): Promise<AiHealthResponse> {
  return apiClient<AiHealthResponse>("/ai/health", {
    method: "GET",
  });
}


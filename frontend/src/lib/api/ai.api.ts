/**
 * AI 서비스 API 클라이언트
 * - 질문 답변
 * - 요약 생성
 * - 퀴즈 생성
 */

const AI_SERVICE_URL = process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

export interface AskRequest {
  note_id: string;
  question: string;
  use_pdf?: boolean;
}

export interface AskResponse {
  answer: string;
}

export interface SummaryRequest {
  note_id: string;
  lines?: number; // 1~10
  use_pdf?: boolean;
}

export interface SummaryResponse {
  summary: string;
}

export interface QuizRequest {
  note_id: string;
  count?: number; // 1~10
  use_pdf?: boolean;
}

export interface QuizQuestion {
  question: string;
  options: string[]; // 4개의 선택지
  correct_answer: number; // 0~3
  explanation: string;
}

export interface QuizResponse {
  quizzes: QuizQuestion[];
}

/**
 * AI에게 질문하기
 */
export async function askQuestion(request: AskRequest): Promise<AskResponse> {
  try {
    console.log("[AI API] 질문 요청:", request);

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/ask`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        use_pdf: request.use_pdf ?? true, // 기본값: PDF 사용
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "질문 처리 실패");
    }

    const data = await response.json();
    console.log("[AI API] 질문 응답 성공");
    return data;
  } catch (error) {
    console.error("[AI API] 질문 실패:", error);
    throw error;
  }
}

/**
 * 요약 생성
 */
export async function generateSummary(
  request: SummaryRequest
): Promise<SummaryResponse> {
  try {
    console.log("[AI API] 요약 요청:", request);

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/summary`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        lines: request.lines ?? 5, // 기본값: 5줄
        use_pdf: request.use_pdf ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "요약 생성 실패");
    }

    const data = await response.json();
    console.log("[AI API] 요약 생성 성공");
    return data;
  } catch (error) {
    console.error("[AI API] 요약 실패:", error);
    throw error;
  }
}

/**
 * 퀴즈 생성
 */
export async function generateQuiz(request: QuizRequest): Promise<QuizResponse> {
  try {
    console.log("[AI API] 퀴즈 요청:", request);

    const response = await fetch(`${AI_SERVICE_URL}/api/ai/quiz`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...request,
        count: request.count ?? 5, // 기본값: 5문제
        use_pdf: request.use_pdf ?? true,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "퀴즈 생성 실패");
    }

    const data = await response.json();
    console.log("[AI API] 퀴즈 생성 성공:", data.quizzes.length, "문제");
    return data;
  } catch (error) {
    console.error("[AI API] 퀴즈 실패:", error);
    throw error;
  }
}



import { Injectable, Logger } from '@nestjs/common';
import { RagEngineService } from './services/rag-engine.service';
import { ChatRequestDto, ChatResponseDto, ChatMode } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly ragEngine: RagEngineService) {}

  /**
   * 챗봇 대화 처리 (RAG 기반)
   */
  async chat(params: {
    lectureNoteId: string;
    question: string;
    mode?: ChatMode;
    userId?: string;
  }): Promise<ChatResponseDto> {
    this.logger.debug(
      `Chat request for note ${params.lectureNoteId}, mode: ${params.mode}, userId: ${params.userId}`
    );

    try {
      const { answer, citations } = await this.ragEngine.queryWithRag(
        params.lectureNoteId,
        params.question,
        params.mode || ChatMode.QUESTION
      );

      return {
        answer,
        citations,
      };
    } catch (error) {
      this.logger.error('Chat request failed', error);

      // 에러 메시지 구성
      let errorMessage = '죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.';

      if ((error as Error).message.includes('not found')) {
        errorMessage = '요청하신 노트를 찾을 수 없습니다.';
      } else if ((error as Error).message.includes('No content found')) {
        errorMessage = '이 노트에는 분석할 수 있는 내용이 없습니다. 먼저 강의 내용을 추가해주세요.';
      } else if ((error as Error).message.includes('API')) {
        errorMessage = 'AI 서비스 연결에 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * 헬스 체크
   */
  async healthCheck(): Promise<{ status: string; geminiConfigured: boolean }> {
    const geminiConfigured = !!(process.env.GEMINI_API_KEY);
    return {
      status: geminiConfigured ? 'ok' : 'missing_api_key',
      geminiConfigured,
    };
  }
}

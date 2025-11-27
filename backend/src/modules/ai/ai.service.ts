import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly aiServiceUrl: string;

  constructor(private readonly httpService: HttpService) {
    this.aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    this.logger.log(`AI Service URL: ${this.aiServiceUrl}`);
  }

  /**
   * 질문에 답변하기
   */
  async ask(noteId: string, question: string): Promise<string> {
    this.logger.log(`[ASK] noteId=${noteId}, question=${question.substring(0, 50)}...`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ answer: string }>(`${this.aiServiceUrl}/api/ai/ask`, {
          note_id: noteId,
          question: question,
        })
      );

      return response.data.answer;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(`[ASK] Error:`, error.response?.data || error.message);
      throw new BadRequestException('질문 처리 중 오류가 발생했습니다.');
    }
  }

  /**
   * 강의 내용 요약하기
   */
  async summarize(noteId: string, lines: number = 3): Promise<string> {
    this.logger.log(`[SUMMARY] noteId=${noteId}, lines=${lines}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ summary: string }>(`${this.aiServiceUrl}/api/ai/summary`, {
          note_id: noteId,
          lines: lines,
        })
      );

      return response.data.summary;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(`[SUMMARY] Error:`, error.response?.data || error.message);
      throw new BadRequestException('요약 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 퀴즈 생성하기
   */
  async generateQuiz(noteId: string, count: number = 5): Promise<QuizQuestion[]> {
    this.logger.log(`[QUIZ] noteId=${noteId}, count=${count}`);

    try {
      const response = await firstValueFrom(
        this.httpService.post<{ quizzes: QuizQuestion[] }>(`${this.aiServiceUrl}/api/ai/quiz`, {
          note_id: noteId,
          count: count,
        })
      );

      return response.data.quizzes;
    } catch (err) {
      const error = err as AxiosError;
      this.logger.error(`[QUIZ] Error:`, error.response?.data || error.message);
      throw new BadRequestException('퀴즈 생성 중 오류가 발생했습니다.');
    }
  }
}

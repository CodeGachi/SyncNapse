import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AiService, QuizQuestion } from './ai.service';

@ApiTags('AI 챗봇')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  @ApiOperation({ 
    summary: '📝 강의 내용에 대해 질문하기',
    description: '노트의 전사 내용을 기반으로 AI가 질문에 답변합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '질문 성공',
    schema: {
      example: {
        answer: '이차방정식은 ax² + bx + c = 0 형태의 방정식입니다...'
      }
    }
  })
  async ask(
    @Body() body: { noteId: string; question: string }
  ) {
    const answer = await this.aiService.ask(body.noteId, body.question);
    return { answer };
  }

  @Post('summary')
  @ApiOperation({ 
    summary: '📄 강의 내용 요약하기',
    description: '노트의 전사 내용을 지정한 줄 수로 요약합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '요약 성공',
    schema: {
      example: {
        summary: '1. 데이터 구조는...\n2. 배열은...\n3. 시간복잡도는...'
      }
    }
  })
  async summarize(
    @Body() body: { noteId: string; lines?: number }
  ) {
    const summary = await this.aiService.summarize(
      body.noteId, 
      body.lines || 3
    );
    return { summary };
  }

  @Post('quiz')
  @ApiOperation({ 
    summary: '🎯 퀴즈 생성하기',
    description: '노트의 전사 내용을 기반으로 객관식 퀴즈를 생성합니다.'
  })
  @ApiResponse({ 
    status: 200, 
    description: '퀴즈 생성 성공',
    schema: {
      example: {
        quizzes: [
          {
            question: '배열의 시간복잡도는?',
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n²)'],
            correct_answer: 0,
            explanation: '배열의 인덱스 접근은 O(1)입니다.'
          }
        ]
      }
    }
  })
  async generateQuiz(
    @Body() body: { noteId: string; count?: number }
  ) {
    const quizzes = await this.aiService.generateQuiz(
      body.noteId, 
      body.count || 5
    );
    return { quizzes };
  }
}

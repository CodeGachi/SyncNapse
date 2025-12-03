import { Controller, Post, Body, Get, UseGuards, Req, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatRequestDto, ChatResponseDto } from './dto/chat.dto';

@Controller('ai')
export class AiController {
  private readonly logger = new Logger(AiController.name);

  constructor(private readonly aiService: AiService) {}

  /**
   * POST /api/ai/chat
   * AI 챗봇과 대화하기
   */
  @Post('chat')
  @HttpCode(HttpStatus.OK)
  async chat(
    @Body() chatRequest: ChatRequestDto,
    @Req() req: any
  ): Promise<ChatResponseDto> {
    this.logger.debug(`Chat request received: ${JSON.stringify(chatRequest)}`);

    // 요청한 사용자 ID (인증된 경우)
    const userId = req.user?.userId;

    try {
      const response = await this.aiService.chat({
        lectureNoteId: chatRequest.lectureNoteId,
        question: chatRequest.question,
        mode: chatRequest.mode,
        userId,
      });

      return response;
    } catch (error) {
      this.logger.error('Chat request error', error);
      throw error;
    }
  }

  /**
   * GET /api/ai/health
   * AI 서비스 헬스 체크
   */
  @Get('health')
  async health() {
    return this.aiService.healthCheck();
  }
}

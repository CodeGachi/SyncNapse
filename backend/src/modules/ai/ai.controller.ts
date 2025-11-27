import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AskDto } from './dto/ask.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('ask')
  @ApiOperation({ summary: '노트 내용에 대해 AI에게 질문하기' })
  async ask(@Body() dto: AskDto): Promise<{ answer: string }> {
    const answer = await this.aiService.ask(dto.noteId, dto.question);
    return { answer };
  }
}


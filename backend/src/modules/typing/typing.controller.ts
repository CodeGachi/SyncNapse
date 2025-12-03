import { Controller, Get, Post, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TypingService } from './typing.service';
import { SavePageContentDto } from './dto/save-page-content.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('typing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes/:noteId/typing')
export class TypingController {
  constructor(private readonly typingService: TypingService) {}

  @Get()
  @ApiOperation({ summary: 'Get typing content for a specific page' })
  @ApiQuery({ name: 'fileId', required: true })
  @ApiQuery({ name: 'pageNumber', required: true, type: Number })
  async getPageContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Query('fileId') fileId: string,
    @Query('pageNumber', ParseIntPipe) pageNumber: number,
  ) {
    return this.typingService.getPageContent(userId, noteId, fileId, pageNumber);
  }

  @Post()
  @ApiOperation({ summary: 'Save typing content (Delta) with Optimistic Locking' })
  async savePageContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: SavePageContentDto,
  ) {
    return this.typingService.savePageContent(userId, noteId, dto);
  }
}

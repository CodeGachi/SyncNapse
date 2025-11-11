import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { TranscriptionService } from './transcription.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveTranscriptDto } from './dto/save-transcript.dto';
import { SaveAudioChunkDto } from './dto/save-audio-chunk.dto';
import { SaveFullAudioDto } from './dto/save-full-audio.dto';

@Controller('transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  private readonly logger = new Logger(TranscriptionController.name);

  constructor(private readonly transcriptionService: TranscriptionService) {}

  @Post('sessions')
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    this.logger.debug(`[POST /transcription/sessions] userId=${userId} title=${dto.title} noteId=${dto.noteId || 'NULL'}`);
    return this.transcriptionService.createSession(userId, dto);
  }

  @Get('sessions')
  async getSessions(@CurrentUser('id') userId: string) {
    this.logger.debug(`[GET /transcription/sessions] userId=${userId}`);
    return this.transcriptionService.getSessionsByUser(userId);
  }

  @Get('sessions/:id')
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[GET /transcription/sessions/${sessionId}] userId=${userId}`);
    return this.transcriptionService.getSessionById(userId, sessionId);
  }

  @Post('sessions/:id/end')
  async endSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[POST /transcription/sessions/${sessionId}/end] userId=${userId}`);
    return this.transcriptionService.endSession(userId, sessionId);
  }

  @Delete('sessions/:id')
  async deleteSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[DELETE /transcription/sessions/${sessionId}] userId=${userId}`);
    return this.transcriptionService.deleteSession(userId, sessionId);
  }

  @Post('segments')
  async saveTranscript(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveTranscriptDto,
  ) {
    this.logger.debug(`[POST /transcription/segments] userId=${userId} sessionId=${dto.sessionId}`);
    this.logger.debug(`[POST /transcription/segments] dto:`, JSON.stringify(dto));
    
    try {
      const result = await this.transcriptionService.saveTranscript(userId, dto);
      this.logger.debug(`[POST /transcription/segments] ✅ Success: segmentId=${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`[POST /transcription/segments] ❌ Error:`, error);
      throw error;
    }
  }

  @Post('audio-chunks')
  async saveAudioChunk(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveAudioChunkDto,
  ) {
    this.logger.debug(`[POST /transcription/audio-chunks] userId=${userId} sessionId=${dto.sessionId} chunk=${dto.chunkIndex}`);
    return this.transcriptionService.saveAudioChunk(userId, dto);
  }

  @Post('full-audio')
  async saveFullAudio(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveFullAudioDto,
  ) {
    this.logger.debug(`[POST /transcription/full-audio] userId=${userId} sessionId=${dto.sessionId} duration=${dto.duration}`);
    return this.transcriptionService.saveFullAudio(userId, dto.sessionId, dto.audioUrl, dto.duration);
  }

  @Get('sessions/:sessionId/audio')
  async streamAudio(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.debug(`[GET /transcription/sessions/${sessionId}/audio] userId=${userId}`);
    
    try {
      const { stream, contentType, contentLength } = await this.transcriptionService.getAudioStream(userId, sessionId);
      
      this.logger.debug(`[GET /transcription/sessions/${sessionId}/audio] Streaming:`, {
        contentType,
        contentLength,
      });
      
      // Set response headers
      res.set({
        'Content-Type': contentType,
        'Content-Length': contentLength.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });
      
      return new StreamableFile(stream);
    } catch (error) {
      this.logger.error(`[GET /transcription/sessions/${sessionId}/audio] ❌ Error:`, error);
      throw error;
    }
  }
}

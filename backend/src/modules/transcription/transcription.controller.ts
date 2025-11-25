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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { TranscriptionService } from './transcription.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveTranscriptDto } from './dto/save-transcript.dto';
import { SaveAudioChunkDto } from './dto/save-audio-chunk.dto';
import { SaveFullAudioDto } from './dto/save-full-audio.dto';
import { UpdateTranscriptDto } from './dto/update-transcript.dto';

@ApiTags('transcription')
@ApiBearerAuth()
@Controller('transcription')
@UseGuards(JwtAuthGuard)
export class TranscriptionController {
  private readonly logger = new Logger(TranscriptionController.name);

  constructor(private readonly transcriptionService: TranscriptionService) { }

  @Post('sessions')
  @ApiOperation({ summary: 'Start a new transcription session' })
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    this.logger.debug(`[POST /transcription/sessions] userId=${userId} title=${dto.title} noteId=${dto.noteId || 'NULL'}`);
    return this.transcriptionService.createSession(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List all transcription sessions for user' })
  async getSessions(@CurrentUser('id') userId: string) {
    this.logger.debug(`[GET /transcription/sessions] userId=${userId}`);
    return this.transcriptionService.getSessionsByUser(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get session details including segments' })
  async getSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[GET /transcription/sessions/${sessionId}] userId=${userId}`);
    return this.transcriptionService.getSessionById(userId, sessionId);
  }

  @Post('sessions/:id/end')
  @ApiOperation({ summary: 'End a transcription session' })
  async endSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[POST /transcription/sessions/${sessionId}/end] userId=${userId}`);
    return this.transcriptionService.endSession(userId, sessionId);
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete a session' })
  async deleteSession(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[DELETE /transcription/sessions/${sessionId}] userId=${userId}`);
    return this.transcriptionService.deleteSession(userId, sessionId);
  }

  @Post('segments')
  @ApiOperation({ summary: 'Save a transcription segment (real-time)' })
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
  @ApiOperation({ summary: 'Upload an audio chunk (deprecated, prefer full-audio)' })
  async saveAudioChunk(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveAudioChunkDto,
  ) {
    this.logger.debug(`[POST /transcription/audio-chunks] userId=${userId} sessionId=${dto.sessionId} chunk=${dto.chunkIndex}`);
    return this.transcriptionService.saveAudioChunk(userId, dto);
  }

  @Post('full-audio')
  @ApiOperation({ summary: 'Upload full audio recording after session ends' })
  async saveFullAudio(
    @CurrentUser('id') userId: string,
    @Body() dto: SaveFullAudioDto,
  ) {
    this.logger.debug(`[POST /transcription/full-audio] userId=${userId} sessionId=${dto.sessionId} duration=${dto.duration}`);
    return this.transcriptionService.saveFullAudio(userId, dto.sessionId, dto.audioUrl, dto.duration);
  }

  @Get('sessions/:sessionId/audio')
  @ApiOperation({ summary: 'Stream audio file' })
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

  @Post('sessions/:id/revisions')
  @ApiOperation({ summary: 'Save a new revision of the full transcript' })
  @ApiBody({ type: UpdateTranscriptDto })
  async saveTranscriptRevision(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
    @Body() dto: UpdateTranscriptDto,
  ) {
    this.logger.debug(`[POST /transcription/sessions/${sessionId}/revisions] userId=${userId}`);
    return this.transcriptionService.saveTranscriptRevision(userId, sessionId, dto.content);
  }

  @Get('sessions/:id/revisions')
  @ApiOperation({ summary: 'Get revision history' })
  async getTranscriptRevisions(
    @CurrentUser('id') userId: string,
    @Param('id') sessionId: string,
  ) {
    this.logger.debug(`[GET /transcription/sessions/${sessionId}/revisions] userId=${userId}`);
    return this.transcriptionService.getTranscriptRevisions(userId, sessionId);
  }
}

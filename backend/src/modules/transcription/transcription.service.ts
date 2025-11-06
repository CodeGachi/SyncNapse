import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveTranscriptDto } from './dto/save-transcript.dto';
import { SaveAudioChunkDto } from './dto/save-audio-chunk.dto';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async createSession(userId: string, dto: CreateSessionDto) {
    this.logger.debug(`[createSession] userId=${userId} title=${dto.title}`);

    const session = await this.prisma.transcriptionSession.create({
      data: {
        userId,
        title: dto.title,
        status: 'recording',
      },
    });

    this.logger.log(`[createSession] Created session: ${session.id}`);
    return session;
  }

  async getSessionsByUser(userId: string) {
    this.logger.debug(`[getSessionsByUser] userId=${userId}`);

    const sessions = await this.prisma.transcriptionSession.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            segments: true,
            audioChunks: true,
          },
        },
      },
    });

    return sessions;
  }

  async getSessionById(userId: string, sessionId: string) {
    this.logger.debug(`[getSessionById] userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
      },
      include: {
        segments: {
          orderBy: {
            startTime: 'asc',
          },
        },
        audioChunks: {
          orderBy: {
            chunkIndex: 'asc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const chunksWithUrls = await Promise.all(
      session.audioChunks.map(async (chunk) => {
        try {
          const signedUrl = await this.storageService.getSignedUrl(chunk.storageKey);
          return {
            ...chunk,
            signedUrl,
            audioUrl: signedUrl,
          };
        } catch (error) {
          this.logger.error(`[getSessionById] Failed to get signed URL for chunk ${chunk.id}:`, error);
          return {
            ...chunk,
            signedUrl: chunk.storageUrl,
            audioUrl: chunk.storageUrl,
          };
        }
      })
    );

    return {
      ...session,
      audioChunks: chunksWithUrls,
    };
  }

  async saveTranscript(userId: string, dto: SaveTranscriptDto) {
    this.logger.debug(`[saveTranscript] userId=${userId} sessionId=${dto.sessionId}`);
    this.logger.debug(`[saveTranscript] text="${dto.text.substring(0, Math.min(50, dto.text.length))}..." length=${dto.text.length}`);
    this.logger.debug(`[saveTranscript] startTime=${dto.startTime} endTime=${dto.endTime} isPartial=${dto.isPartial}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: dto.sessionId,
        userId,
        deletedAt: null,
      },
    });

    if (!session) {
      this.logger.error(`[saveTranscript] ❌ Session not found: sessionId=${dto.sessionId} userId=${userId}`);
      throw new NotFoundException('Session not found');
    }

    this.logger.debug(`[saveTranscript] ✅ Session verified: ${session.id}`);

    try {
    const segment = await this.prisma.transcriptionSegment.create({
      data: {
        sessionId: dto.sessionId,
        text: dto.text,
        startTime: new Prisma.Decimal(dto.startTime),
        endTime: new Prisma.Decimal(dto.endTime),
          confidence: dto.confidence ? new Prisma.Decimal(dto.confidence) : new Prisma.Decimal(1.0),
        isPartial: dto.isPartial || false,
        language: dto.language || 'ko',
      },
    });

      this.logger.log(`[saveTranscript] ✅ Saved segment: ${segment.id} (partial: ${segment.isPartial})`);
    return segment;
    } catch (error) {
      this.logger.error(`[saveTranscript] ❌ Database error:`, error);
      throw error;
    }
  }

  async saveAudioChunk(userId: string, dto: SaveAudioChunkDto) {
    this.logger.debug(`[saveAudioChunk] sessionId=${dto.sessionId} chunkIndex=${dto.chunkIndex}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: dto.sessionId,
        userId,
        deletedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Debug: Check audioUrl format
    this.logger.debug(`[saveAudioChunk] audioUrl prefix: ${dto.audioUrl.substring(0, 50)}...`);
    
    if (!dto.audioUrl.includes('base64,')) {
      this.logger.error(`[saveAudioChunk] ❌ Invalid audioUrl format: ${dto.audioUrl.substring(0, 100)}`);
      throw new Error('Invalid audio URL format. Expected data URL with base64 encoding.');
    }

    const base64Data = dto.audioUrl.split(',')[1];
    
    if (!base64Data) {
      this.logger.error(`[saveAudioChunk] ❌ No base64 data found after splitting`);
      throw new Error('No base64 data found in audio URL');
    }
    
    this.logger.debug(`[saveAudioChunk] Base64 data length: ${base64Data.length}`);
    const buffer = Buffer.from(base64Data, 'base64');
    this.logger.debug(`[saveAudioChunk] Buffer size: ${buffer.length} bytes`);

    const fileExtension = 'webm';
    const { url, key } = await this.storageService.uploadAudioChunk(
      buffer,
      userId,
      session.id,
      dto.chunkIndex,
      fileExtension,
    );

    const audioChunk = await this.prisma.audioChunk.create({
      data: {
        sessionId: dto.sessionId,
        chunkIndex: dto.chunkIndex,
        startTime: dto.startTime,
        endTime: dto.endTime,
        duration: dto.duration,
        sampleRate: dto.sampleRate,
        storageUrl: url,
        storageKey: key,
        fileSize: buffer.length,
      },
    });

    const currentDuration = typeof session.duration === 'object' 
      ? Number(session.duration) 
      : session.duration;
    
    await this.prisma.transcriptionSession.update({
      where: { id: dto.sessionId },
      data: {
        duration: Math.max(currentDuration, dto.endTime),
      },
    });

    this.logger.log(`[saveAudioChunk] Saved audio chunk: ${audioChunk.id}`);
    return audioChunk;
  }

  async endSession(userId: string, sessionId: string) {
    this.logger.debug(`[endSession] userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const updatedSession = await this.prisma.transcriptionSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
      },
    });

    this.logger.log(`[endSession] Session ended: ${sessionId}`);
    return updatedSession;
  }

  async deleteSession(userId: string, sessionId: string) {
    this.logger.debug(`[deleteSession] userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
      },
      include: {
        audioChunks: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    for (const chunk of session.audioChunks) {
      try {
        await this.storageService.deleteFile(chunk.storageKey);
      } catch (error) {
        this.logger.error(`[deleteSession] Failed to delete chunk ${chunk.id}:`, error);
      }
    }

    await this.prisma.transcriptionSession.update({
      where: { id: sessionId },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.log(`[deleteSession] Session deleted: ${sessionId}`);
    return { success: true };
  }
}

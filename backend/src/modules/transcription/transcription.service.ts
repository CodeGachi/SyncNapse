import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SaveTranscriptDto } from './dto/save-transcript.dto';
import { SaveAudioChunkDto } from './dto/save-audio-chunk.dto';
import { Readable } from 'stream';

@Injectable()
export class TranscriptionService {
  private readonly logger = new Logger(TranscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => NotesService))
    private readonly notesService: NotesService,
  ) { }

  // ... existing createSession, saveTimelineEvent methods ...

  async createSession(userId: string, dto: CreateSessionDto & { audioRecordingId?: string }) {
    this.logger.debug(`[createSession] userId=${userId} title=${dto.title} noteId=${dto.noteId || 'none'}`);

    if (dto.noteId) {
      const note = await this.prisma.lectureNote.findUnique({
        where: { id: dto.noteId },
      });
      if (!note) {
        throw new NotFoundException(`Note not found: ${dto.noteId}`);
      }
    }

    const session = await this.prisma.transcriptionSession.create({
      data: {
        userId,
        title: dto.title,
        noteId: dto.noteId,
        audioRecordingId: dto.audioRecordingId,
        status: 'recording',
      },
    });

    this.logger.log(`[createSession] Created session: ${session.id} for note: ${dto.noteId || 'standalone'}`);
    return session;
  }

  async saveTimelineEvent(userId: string, recordingId: string, event: { timestamp: number; fileId?: string; pageNumber?: number }) {
    this.logger.debug(`[saveTimelineEvent] userId=${userId} recordingId=${recordingId} time=${event.timestamp}`);

    // Verify recording ownership (via Note)
    const recording = await this.prisma.audioRecording.findUnique({
      where: { id: recordingId },
      include: { note: { include: { foldersLink: { include: { folder: true } } } } },
    });

    if (!recording) {
      throw new NotFoundException('Audio recording not found');
    }

    // Check permission
    const hasAccess = recording.note.foldersLink.some(link => link.folder.userId === userId);
    if (!hasAccess) {
      this.logger.warn(`[saveTimelineEvent] User ${userId} does not have access to recording ${recordingId}`);
      // TODO: Throw ForbiddenException if strict access control is needed
    }

    const timelineEvent = await this.prisma.audioTimelineEvent.create({
      data: {
        recordingId,
        timestamp: new Prisma.Decimal(event.timestamp),
        fileId: event.fileId,
        pageNumber: event.pageNumber,
      },
    });

    return timelineEvent;
  }

  async saveTranscriptRevision(userId: string, sessionId: string, content: any) {
    this.logger.debug(`[saveTranscriptRevision] userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Get latest version
    const latestRevision = await this.prisma.transcriptRevision.findFirst({
      where: { sessionId },
      orderBy: { version: 'desc' },
    });

    const newVersion = (latestRevision?.version || 0) + 1;

    const revision = await this.prisma.transcriptRevision.create({
      data: {
        sessionId,
        version: newVersion,
        content: content,
      },
    });

    // Update active transcript pointer
    await this.prisma.transcriptionSession.update({
      where: { id: sessionId },
      data: { activeTranscriptId: revision.id },
    });

    return revision;
  }

  async getTranscriptRevisions(userId: string, sessionId: string) {
    const session = await this.prisma.transcriptionSession.findFirst({
      where: { id: sessionId, userId, deletedAt: null },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.prisma.transcriptRevision.findMany({
      where: { sessionId },
      orderBy: { version: 'desc' },
    });
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
          include: {
            words: {
              orderBy: {
                wordIndex: 'asc',
              },
            },
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

    // Use public URLs directly for audioChunks (uploaded with public-read ACL)
    // No need for signed URLs which can cause 403 errors
    const chunksWithUrls = session.audioChunks.map((chunk) => ({
      ...chunk,
      audioUrl: chunk.storageUrl, // Use direct public URL
      signedUrl: chunk.storageUrl, // Keep for backward compatibility
    }));

    // For fullAudioUrl: use public URL directly (files are uploaded with public-read ACL)
    // No need for signed URL which can cause 403 errors
    this.logger.debug(`[getSessionById] Full audio URL: ${session.fullAudioUrl || 'none'}`);

    return {
      ...session,
      audioChunks: chunksWithUrls,
      fullAudioUrl: session.fullAudioUrl, // Use direct public URL
    };
  }

  async saveTranscript(userId: string, dto: SaveTranscriptDto) {
    this.logger.debug(`[saveTranscript] userId=${userId} sessionId=${dto.sessionId}`);
    this.logger.debug(`[saveTranscript] text="${dto.text.substring(0, Math.min(50, dto.text.length))}..." length=${dto.text.length}`);
    this.logger.debug(`[saveTranscript] startTime=${dto.startTime} isPartial=${dto.isPartial}`);
    this.logger.debug(`[saveTranscript] words count=${dto.words?.length || 0}`);

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
      // Calculate endTime based on estimated duration (2.5 words per second)
      // Words only have startTime, so estimate segment duration
      const wordCount = dto.text.trim().split(/\s+/).length;
      const estimatedDuration = wordCount / 2.5;
      const calculatedEndTime = dto.startTime + estimatedDuration;

      this.logger.debug(`[saveTranscript] Using endTime=${calculatedEndTime} (startTime + ${estimatedDuration.toFixed(2)}s for ${wordCount} words)`);

      // Create segment first
      const segment = await this.prisma.transcriptionSegment.create({
        data: {
          sessionId: dto.sessionId,
          text: dto.text,
          startTime: new Prisma.Decimal(dto.startTime),
          endTime: new Prisma.Decimal(calculatedEndTime), // Stored for reference only
          confidence: dto.confidence ? new Prisma.Decimal(dto.confidence) : new Prisma.Decimal(1.0),
          isPartial: dto.isPartial || false,
          language: dto.language || 'ko',
        },
      });

      // Create word-level timestamps if provided (separate query to avoid nested create issues)
      if (dto.words && dto.words.length > 0) {
        await this.prisma.transcriptionWord.createMany({
          data: dto.words.map((word) => ({
            segmentId: segment.id,
            word: word.word,
            startTime: new Prisma.Decimal(word.startTime),
            confidence: word.confidence ? new Prisma.Decimal(word.confidence) : new Prisma.Decimal(1.0),
            wordIndex: word.wordIndex,
          })),
        });
        this.logger.debug(`[saveTranscript] ✅ Created ${dto.words.length} words for segment ${segment.id}`);
      }

      // Fetch complete segment with words
      const completeSegment = await this.prisma.transcriptionSegment.findUnique({
        where: { id: segment.id },
        include: { words: true },
      });

      this.logger.log(`[saveTranscript] ✅ Saved segment: ${segment.id} (partial: ${segment.isPartial}, words: ${dto.words?.length || 0})`);
      return completeSegment || segment;
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

    try {
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
    } catch (error) {
      this.logger.warn(`[saveAudioChunk] DB insert failed, cleaning up chunk: ${key}`);
      try {
        await this.storageService.deleteFile(key);
      } catch (cleanupError) {
        this.logger.error(`[saveAudioChunk] Failed to cleanup chunk:`, cleanupError);
      }
      throw error;
    }
  }

  /**
   * Save full audio file for transcription session
   * Replaces chunk-based approach with single file
   */
  async saveFullAudio(userId: string, sessionId: string, audioUrl: string, duration: number) {
    this.logger.debug(`[saveFullAudio] sessionId=${sessionId} duration=${duration}`);

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

    // Debug: Check audioUrl format
    this.logger.debug(`[saveFullAudio] audioUrl prefix: ${audioUrl.substring(0, 50)}...`);

    if (!audioUrl.includes('base64,')) {
      this.logger.error(`[saveFullAudio] ❌ Invalid audioUrl format: ${audioUrl.substring(0, 100)}`);
      throw new Error('Invalid audio URL format. Expected data URL with base64 encoding.');
    }

    const base64Data = audioUrl.split(',')[1];

    if (!base64Data) {
      this.logger.error(`[saveFullAudio] ❌ No base64 data found after splitting`);
      throw new Error('No base64 data found in audio URL');
    }

    this.logger.debug(`[saveFullAudio] Base64 data length: ${base64Data.length}`);
    const buffer = Buffer.from(base64Data, 'base64');
    this.logger.debug(`[saveFullAudio] Buffer size: ${buffer.length} bytes`);
    this.logger.debug(`[saveFullAudio] Session noteId: ${session.noteId || 'NULL'} - Will use note-based path: ${!!session.noteId}`);

    let storageKey: string;
    let url: string;

    if (session.noteId) {
      // Note-based path: use existing note folder structure
      try {
        const noteBasePath = await this.notesService.getNoteStoragePath(userId, session.noteId);

        // Sanitize session title for filename
        const sanitizedTitle = encodeURIComponent(session.title)
          .replace(/%20/g, ' ')
          .replace(/%2F/g, '_')
          .replace(/%5C/g, '_');

        // Store in note's audio subdirectory with recording title
        storageKey = `${noteBasePath}/audio/${sanitizedTitle}.webm`;

        this.logger.log(`[saveFullAudio] Saving to note folder: ${storageKey}`);

        // Upload using generic uploadBuffer method
        const uploadResult = await this.storageService.uploadBuffer(
          buffer,
          storageKey,
          'audio/webm',
        );

        url = uploadResult.publicUrl || this.storageService.getPublicUrl(uploadResult.storageKey);
        storageKey = uploadResult.storageKey;

        this.logger.log(`[saveFullAudio] ✅ Saved to note audio folder: ${storageKey}`);
      } catch (error) {
        this.logger.error(`[saveFullAudio] Failed to get note path, falling back to session-based path:`, error);
        // Fallback to old method
        const fileExtension = 'webm';
        const fallbackResult = await this.storageService.uploadFullAudio(
          buffer,
          userId,
          sessionId,
          fileExtension,
          undefined,
        );
        url = fallbackResult.url;
        storageKey = fallbackResult.key;
      }
    } else {
      // User-based path (fallback for sessions without noteId)
      const fileExtension = 'webm';
      const result = await this.storageService.uploadFullAudio(
        buffer,
        userId,
        sessionId,
        fileExtension,
        undefined,
      );
      url = result.url;
      storageKey = result.key;

      this.logger.log(`[saveFullAudio] ✅ Saved to user transcription folder: ${storageKey}`);
    }

    // Update session with full audio URL
    const updatedSession = await this.prisma.transcriptionSession.update({
      where: { id: sessionId },
      data: {
        fullAudioUrl: url,
        fullAudioKey: storageKey,
        fullAudioSize: buffer.length,
        duration: Math.max(Number(session.duration), duration),
      },
    });

    this.logger.log(`[saveFullAudio] ✅ Full audio saved: ${storageKey} (${buffer.length} bytes)`);
    return updatedSession;
  }

  async endSession(userId: string, sessionId: string) {
    this.logger.debug(`[endSession] userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
      },
      include: {
        segments: {
          include: {
            words: true,
          },
          orderBy: {
            startTime: 'asc',
          },
        },
        audioChunks: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if full audio or chunks exist
    const hasAudio = session.fullAudioKey || (session.audioChunks && session.audioChunks.length > 0);
    if (!hasAudio) {
      this.logger.warn(`[endSession] ⚠️ Session ended without audio: ${sessionId}`);
      // Consider throwing error if audio is mandatory, but for now just warn
    }

    // Save transcription segments to MinIO as JSON if noteId exists
    if (session.noteId && session.segments.length > 0) {
      try {
        const noteBasePath = await this.notesService.getNoteStoragePath(userId, session.noteId);

        // Sanitize session title for filename
        const sanitizedTitle = encodeURIComponent(session.title)
          .replace(/%20/g, ' ')
          .replace(/%2F/g, '_')
          .replace(/%5C/g, '_');

        // Create transcription JSON
        const transcriptionData = {
          sessionId: session.id,
          title: session.title,
          duration: Number(session.duration),
          createdAt: session.createdAt.toISOString(),
          segments: session.segments.map(seg => ({
            id: seg.id,
            text: seg.text,
            startTime: Number(seg.startTime),
            endTime: Number(seg.endTime),
            confidence: Number(seg.confidence),
            language: seg.language,
            words: seg.words.map(w => ({
              word: w.word,
              startTime: Number(w.startTime),
              confidence: Number(w.confidence),
              wordIndex: w.wordIndex,
            })),
          })),
        };

        const transcriptionKey = `${noteBasePath}/transcription/${sanitizedTitle}_segments.json`;

        this.logger.log(`[endSession] Saving transcription to: ${transcriptionKey}`);

        await this.storageService.uploadBuffer(
          Buffer.from(JSON.stringify(transcriptionData, null, 2)),
          transcriptionKey,
          'application/json',
        );

        this.logger.log(`[endSession] ✅ Saved transcription JSON: ${transcriptionKey}`);
      } catch (error) {
        this.logger.error(`[endSession] Failed to save transcription JSON:`, error);
        // Don't fail the request if transcription save fails
      }
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

  // Get audio stream from storage for frontend playback
  // This avoids CORS and signed URL issues by proxying through backend
  async getAudioStream(userId: string, sessionId: string): Promise<{
    stream: Readable;
    contentType: string;
    contentLength: number;
  }> {
    this.logger.debug(`[getAudioStream] userId=${userId} sessionId=${sessionId}`);

    // Get session and verify ownership
    const session = await this.prisma.transcriptionSession.findFirst({
      where: {
        id: sessionId,
        userId,
        deletedAt: null,
      },
    });

    if (!session) {
      this.logger.error(`[getAudioStream] ❌ Session not found: ${sessionId}`);
      throw new NotFoundException('Session not found');
    }

    // Prefer fullAudioKey, fallback to first audio chunk
    let storageKey: string | null = null;
    let expectedSize = 0;

    if (session.fullAudioKey) {
      storageKey = session.fullAudioKey;
      expectedSize = Number(session.fullAudioSize) || 0;
      this.logger.debug(`[getAudioStream] Using full audio: ${storageKey} (${expectedSize} bytes)`);
    } else {
      // Fallback to first chunk
      const firstChunk = await this.prisma.audioChunk.findFirst({
        where: { sessionId },
        orderBy: { chunkIndex: 'asc' },
      });

      if (firstChunk) {
        storageKey = firstChunk.storageKey;
        expectedSize = Number(firstChunk.fileSize) || 0;
        this.logger.debug(`[getAudioStream] Using audio chunk: ${storageKey} (${expectedSize} bytes)`);
      }
    }

    if (!storageKey) {
      this.logger.error(`[getAudioStream] ❌ No audio file found for session: ${sessionId}`);
      throw new NotFoundException('No audio file found for this session');
    }

    // Get file from storage
    try {
      const fileData = await this.storageService.getFileStream(storageKey);

      if (!fileData || !fileData.body) {
        this.logger.error(`[getAudioStream] ❌ No file body returned from storage`);
        throw new NotFoundException('Audio file not found in storage');
      }

      this.logger.debug(`[getAudioStream] Body type:`, typeof fileData.body);
      this.logger.debug(`[getAudioStream] Body is Buffer?:`, Buffer.isBuffer(fileData.body));

      // StorageService returns decrypted Buffer for encrypted files
      let nodeStream: Readable;

      // Check if it's a Buffer (from decryption)
      if (Buffer.isBuffer(fileData.body)) {
        this.logger.debug(`[getAudioStream] Body is Buffer (decrypted), converting to stream`);
        nodeStream = Readable.from(fileData.body);
      }
      // Check if it's already a Node.js Readable stream
      else if (fileData.body instanceof Readable) {
        this.logger.debug(`[getAudioStream] Body is already a Readable stream`);
        nodeStream = fileData.body;
      }
      // StreamingBlobPayloadOutputTypes has transformToByteArray/transformToWebStream methods
      else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sdkBody = fileData.body as any;

        // If it has transformToByteArray, use that to convert
        if (typeof sdkBody.transformToByteArray === 'function') {
          this.logger.debug(`[getAudioStream] Converting Body using transformToByteArray`);
          const byteArray = await sdkBody.transformToByteArray();
          nodeStream = Readable.from(Buffer.from(byteArray));
        }
        // Fallback: try to convert to web stream then to node stream
        else if (typeof sdkBody.transformToWebStream === 'function') {
          this.logger.debug(`[getAudioStream] Converting Body using transformToWebStream`);
          const webStream = sdkBody.transformToWebStream();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          nodeStream = Readable.fromWeb(webStream as any);
        }
        else {
          this.logger.error(`[getAudioStream] ❌ Unknown Body type, cannot convert to stream`);
          throw new Error('Cannot convert MinIO Body to readable stream');
        }
      }

      const contentLength = fileData.contentLength || expectedSize;
      const contentType = fileData.contentType || 'audio/webm';

      this.logger.log(`[getAudioStream] ✅ Streaming audio: ${storageKey}`, {
        contentType,
        contentLength,
      });

      return {
        stream: nodeStream,
        contentType,
        contentLength,
      };
    } catch (error) {
      this.logger.error(`[getAudioStream] ❌ Failed to get audio stream:`, error);
      if (error instanceof Error) {
        this.logger.error(`[getAudioStream] ❌ Error stack:`, error.stack);
      }
      throw error;
    }
  }
}

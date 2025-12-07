import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LoggingService } from '../logging/logging.service';
import { CreateAudioRecordingDto } from './dto/create-audio.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';

@Injectable()
export class AudioService {
  private readonly logger = new Logger(AudioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly loggingService: LoggingService,
  ) {}

  /**
   * Check if user has access to note (owner, collaborator, or public access)
   */
  private async checkNoteAccess(userId: string, noteId: string): Promise<boolean> {
    // Check owner access
    const ownerAccess = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: { userId, deletedAt: null },
        note: { deletedAt: null },
      },
    });

    if (ownerAccess) return true;

    // Check collaborator or public access
    const note = await this.prisma.lectureNote.findFirst({
      where: { id: noteId, deletedAt: null },
    });

    if (!note) return false;

    // Check collaborator access
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const collaborator = await this.prisma.noteCollaborator.findFirst({
        where: {
          noteId,
          OR: [{ userId }, { email: user.email }],
        },
      });
      if (collaborator) return true;
    }

    // Check public access
    if (note.publicAccess === 'PUBLIC_READ' || note.publicAccess === 'PUBLIC_EDIT') {
      return true;
    }

    return false;
  }

  async createRecording(
    userId: string,
    dto: CreateAudioRecordingDto,
    file?: Express.Multer.File,
  ) {
    this.logger.debug(`[createRecording] userId=${userId} noteId=${dto.noteId}`);

    // Verify note ownership/access
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: dto.noteId,
        folder: {
          userId,
          deletedAt: null,
        },
        note: {
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException('Note not found or access denied');
    }

    let fileUrl = '';
    let storageKey = '';

    if (file) {
      // Use structured path similar to Notes module: users/{email}/{folder}/{note}/audio/...
      // For now, trusting storageService to handle path if we pass enough context, 
      // OR we should build the path here. 
      // Let's stick to what storageService offers but maybe improve the sessionId part.
      const upload = await this.storageService.uploadFullAudio(
        file.buffer,
        userId,
        `rec_${Date.now()}`, // Better session ID
        'webm',
        dto.noteId
      );
      fileUrl = upload.url;
      storageKey = upload.key;
    }

    try {
      const recording = await this.prisma.audioRecording.create({
        data: {
          noteId: dto.noteId,
          title: dto.title || 'Untitled Recording',
          durationSec: dto.durationSec,
          fileUrl,
          storageKey,
          isActive: true,
        },
      });

      await this.loggingService.audit({
        userId,
        action: 'audio.create',
        resourceId: recording.id,
        extra: { noteId: dto.noteId, hasFile: !!file }
      });

      return recording;
    } catch (error) {
      // Compensation: Delete uploaded file if DB insert fails
      if (storageKey) {
        this.logger.warn(`[createRecording] DB insert failed, cleaning up file: ${storageKey}`);
        await this.storageService.deleteFile(storageKey).catch(e => 
          this.logger.error(`[createRecording] Failed to cleanup file: ${e.message}`)
        );
      }
      throw error;
    }
  }

  async addTimelineEvent(
    userId: string,
    recordingId: string,
    dto: CreateTimelineEventDto,
  ) {
    // this.logger.debug(`[addTimelineEvent] recordingId=${recordingId} ts=${dto.timestamp}`);

    const recording = await this.prisma.audioRecording.findUnique({
      where: { id: recordingId },
      include: { note: true },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Verify access via Note
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: recording.noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException('Recording not found (Access Denied)');
    }

    return this.prisma.audioTimelineEvent.create({
      data: {
        recordingId,
        timestamp: dto.timestamp,
        fileId: dto.fileId,
        pageNumber: dto.pageNumber,
      },
    });
  }

  async getRecording(userId: string, recordingId: string) {
    const recording = await this.prisma.audioRecording.findUnique({
      where: { id: recordingId },
      include: {
        timelineEvents: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Verify access via Note (owner, collaborator, or public access)
    const hasAccess = await this.checkNoteAccess(userId, recording.noteId);
    if (!hasAccess) {
      throw new NotFoundException('Recording not found (Access Denied)');
    }

    return recording;
  }

  async getTimelineEvents(userId: string, recordingId: string) {
    // Verify access first
    await this.getRecording(userId, recordingId);

    return this.prisma.audioTimelineEvent.findMany({
      where: { recordingId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async deleteRecording(userId: string, recordingId: string) {
    const recording = await this.prisma.audioRecording.findUnique({
      where: { id: recordingId },
    });

    if (!recording) {
      throw new NotFoundException('Recording not found');
    }

    // Verify access via Note
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: recording.noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException('Recording not found (Access Denied)');
    }

    if (recording.storageKey) {
      await this.storageService.deleteFile(recording.storageKey).catch(err => {
        this.logger.warn(`Failed to delete audio file: ${err.message}`);
      });
    }

    await this.prisma.audioRecording.delete({
      where: { id: recordingId },
    });

    await this.loggingService.audit({
      userId,
      action: 'audio.delete',
      resourceId: recordingId,
      extra: { noteId: recording.noteId }
    });

    return { message: 'Recording deleted successfully' };
  }
}


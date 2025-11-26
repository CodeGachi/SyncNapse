import { Injectable, Logger, NotFoundException, ConflictException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { SavePageContentDto } from './dto/save-page-content.dto';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';
import { LoggingService } from '../logging/logging.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TypingService {
  private readonly logger = new Logger(TypingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    @Inject(forwardRef(() => NotesService))
    private readonly notesService: NotesService,
    private readonly loggingService: LoggingService,
  ) {}

  async getPageContent(userId: string, noteId: string, fileId: string, pageNumber: number) {
    const content = await this.prisma.notePageContent.findUnique({
      where: {
        fileId_pageNumber: {
          fileId,
          pageNumber,
        },
      },
    });

    if (!content) {
      return null;
    }

    // Verify noteId matches
    if (content.noteId !== noteId) {
      // logic mismatch
    }

    // Always load from MinIO if storageKey exists (which should be always now)
    if (content.storageKey) {
      try {
        this.logger.debug(`[getPageContent] Loading content from MinIO: ${content.storageKey}`);
        const { body } = await this.storageService.getFileStream(content.storageKey);
        
        let buffer: Buffer;
        if (Buffer.isBuffer(body)) {
          buffer = body;
        } else if ('transformToByteArray' in body && typeof body.transformToByteArray === 'function') {
            const uint8Array = await body.transformToByteArray();
            buffer = Buffer.from(uint8Array);
        } else {
            const chunks: Uint8Array[] = [];
            for await (const chunk of body as AsyncIterable<Uint8Array>) {
                chunks.push(chunk);
            }
            buffer = Buffer.from(Buffer.concat(chunks));
        }
        
        const jsonContent = JSON.parse(buffer.toString('utf-8'));
        return {
          ...content,
          content: jsonContent,
        };
      } catch (error) {
        this.logger.error(`[getPageContent] Failed to load content from MinIO:`, error);
        // If MinIO load fails but we have legacy content in DB, fallback to it?
        // Or return empty?
        // For now, return what's in DB (likely empty object in new flow)
        return content;
      }
    }

    // Legacy fallback: return content from DB if no storageKey
    return content;
  }

  async savePageContent(userId: string, noteId: string, dto: SavePageContentDto) {
    const { fileId, pageNumber, content, expectedVersion } = dto;

    // Always upload to MinIO regardless of size
    const noteBasePath = await this.notesService.getNoteStoragePath(userId, noteId);
    // e.g. users/email/folder/Note/typing/fileId_page.json
    const storageKey = `${noteBasePath}/typing/${fileId}_${pageNumber}.json`;
    const contentString = JSON.stringify(content);
    
    try {
      this.logger.debug(`[savePageContent] Uploading content to MinIO: ${storageKey}`);
      await this.storageService.uploadBuffer(
        Buffer.from(contentString),
        storageKey,
        'application/json'
      );
    } catch (error) {
      this.logger.error(`[savePageContent] Failed to upload content to MinIO:`, error);
      throw new InternalServerErrorException('Failed to save content to storage');
    }

    try {
      // 1. Check if content exists
      const existingContent = await this.prisma.notePageContent.findUnique({
        where: {
          fileId_pageNumber: {
            fileId,
            pageNumber,
          },
        },
      });

      if (existingContent) {
        // Optimistic Locking Check
        if (expectedVersion !== undefined && existingContent.version !== expectedVersion) {
          this.logger.warn(
            `[OptimisticLocking] Conflict for Note ${noteId} File ${fileId} Page ${pageNumber}. Expected ${expectedVersion}, Found ${existingContent.version}`
          );
          throw new ConflictException({
            message: 'Version conflict. Please reload and try again.',
            currentVersion: existingContent.version,
          });
        }

        // Update DB record (only metadata)
        const updatedContent = await this.prisma.notePageContent.update({
          where: {
            id: existingContent.id,
          },
          data: {
            content: {}, // Empty JSON in DB as we use MinIO
            storageKey: storageKey,
            version: { increment: 1 },
          },
        });

        return updatedContent;
      } else {
        // Create new DB record
        // Verify File exists and belongs to Note
        const file = await this.prisma.file.findUnique({
          where: { id: fileId },
        });

        if (!file || file.noteId !== noteId) {
          throw new NotFoundException('File not found or does not belong to this note');
        }

        const createdContent = await this.prisma.notePageContent.create({
          data: {
            noteId,
            fileId,
            pageNumber,
            content: {}, // Empty JSON in DB
            storageKey: storageKey,
            version: 1,
          },
        });

        // Audit log for creation
        await this.loggingService.audit({
          userId,
          action: 'typing.create',
          resourceId: createdContent.id,
          extra: { noteId, fileId, pageNumber, version: 1 }
        });

        return createdContent;
      }
    } catch (error) {
      // Compensation: Delete uploaded file from MinIO if DB update fails
      this.logger.warn(`[savePageContent] DB update failed, rolling back MinIO upload: ${storageKey}`);
      try {
        await this.storageService.deleteFile(storageKey);
      } catch (cleanupError) {
        this.logger.error(`[savePageContent] Failed to rollback MinIO upload:`, cleanupError);
      }
      throw error;
    }
  }
}

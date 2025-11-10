import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FoldersService } from '../folders/folders.service';
import { CreateNoteDto, UpdateNoteDto } from './dto';

@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly foldersService: FoldersService,
  ) {}

  async getNotesByUser(userId: string, folderId?: string) {
    this.logger.debug(`[getNotesByUser] userId=${userId} folderId=${folderId || 'all'}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (folderId === 'root') {
      folderId = undefined;
    }

    if (folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: {
          id: folderId,
          userId,
          deletedAt: null,
        },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found');
      }
    }

    const folderNoteLinks = await this.prisma.folderLectureNote.findMany({
      where: folderId
        ? {
            folderId,
            folder: {
              userId,
              deletedAt: null,
            },
            note: {
              deletedAt: null,
            },
          }
        : {
            folder: {
              userId,
              deletedAt: null,
            },
            note: {
              deletedAt: null,
            },
          },
      include: {
        note: true,
        folder: true,
      },
      orderBy: {
        note: {
          createdAt: 'desc',
        },
      },
    });

    this.logger.debug(`[getNotesByUser] Found ${folderNoteLinks.length} notes`);

    return folderNoteLinks.map((link) => ({
      id: link.note.id,
      title: link.note.title,
      folder_id: link.folderId,
      source_file_url: link.note.sourceFileUrl,
      audio_file_url: link.note.audioFileUrl,
      created_at: link.note.createdAt.toISOString(),
      updated_at: link.note.updatedAt.toISOString(),
    }));
  }

  async getNote(userId: string, noteId: string) {
    this.logger.debug(`[getNote] userId=${userId} noteId=${noteId}`);

    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
          deletedAt: null,
        },
        note: {
          deletedAt: null,
        },
      },
      include: {
        note: true,
        folder: true,
      },
    });

    if (!folderNoteLink) {
      this.logger.warn(`[getNote] Note not found or access denied: ${noteId}`);
      throw new NotFoundException('Note not found');
    }

    return {
      id: folderNoteLink.note.id,
      title: folderNoteLink.note.title,
      folder_id: folderNoteLink.folderId,
      source_file_url: folderNoteLink.note.sourceFileUrl,
      audio_file_url: folderNoteLink.note.audioFileUrl,
      created_at: folderNoteLink.note.createdAt.toISOString(),
      updated_at: folderNoteLink.note.updatedAt.toISOString(),
    };
  }

  async createNote(
    userId: string,
    dto: CreateNoteDto,
    files: Express.Multer.File[],
  ) {
    this.logger.debug(
      `[createNote] Creating note: ${dto.title} for userId=${userId} folderId=${dto.folder_id}`,
    );

    const folder = await this.prisma.folder.findFirst({
      where: {
        id: dto.folder_id,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      this.logger.warn(`[createNote] Folder not found: ${dto.folder_id}`);
      throw new NotFoundException('Folder not found');
    }

    const note = await this.prisma.lectureNote.create({
      data: {
        title: dto.title,
        sourceFileUrl: files.length > 0 ? `temp://${files[0].originalname}` : null,
      },
    });

    await this.prisma.folderLectureNote.create({
      data: {
        folderId: dto.folder_id,
        noteId: note.id,
      },
    });

    this.logger.debug(`[createNote] Created note: ${note.id}`);

    // Build storage path: users/{userNickname}/{folderPath}/{noteId}/
    const folderStoragePath = await this.foldersService.buildFolderStoragePath(userId, dto.folder_id);
    const noteBasePath = `${folderStoragePath}/${note.id}`;

    this.logger.debug(`[createNote] Note base storage path: ${noteBasePath}`);

    if (files.length > 0) {
      this.logger.debug(
        `[createNote] Uploading ${files.length} files: ${files.map((f) => f.originalname).join(', ')}`,
      );

      for (const file of files) {
        try {
          // Determine file category and storage subdirectory
          let storageSubDir = 'files'; // Default for general files
          if (file.mimetype === 'application/pdf') {
            storageSubDir = 'files';
          } else if (file.mimetype.startsWith('audio/')) {
            storageSubDir = 'audio';
          } else if (file.mimetype.includes('text/') || file.mimetype.includes('document')) {
            storageSubDir = 'files';
          }

          // Build storage key: users/{userNickname}/{folderPath}/{noteId}/{subDir}/{filename}
          const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
          const storageKey = `${noteBasePath}/${storageSubDir}/${Date.now()}_${sanitizedFilename}`;

          this.logger.debug(`[createNote] Uploading file to: ${storageKey}`);

          // Upload file using uploadBuffer method
          const result = await this.storageService.uploadBuffer(
            file.buffer,
            storageKey,
            file.mimetype,
          );

          await this.prisma.file.create({
            data: {
              noteId: note.id,
              fileName: file.originalname,
              fileType: file.mimetype,
              fileSize: file.size,
              storageUrl: result.publicUrl || this.storageService.getPublicUrl(storageKey),
              storageKey,
            },
          });

          this.logger.log(`[createNote] ✅ File uploaded: ${file.originalname} to ${storageKey}`);
        } catch (error) {
          this.logger.error(`[createNote] Failed to upload file ${file.originalname}:`, error);
        }
      }
    }

    return {
      id: note.id,
      title: note.title,
      folder_id: dto.folder_id,
      source_file_url: note.sourceFileUrl,
      audio_file_url: note.audioFileUrl,
      created_at: note.createdAt.toISOString(),
      updated_at: note.updatedAt.toISOString(),
    };
  }

  async getFilesForNote(userId: string, noteId: string) {
    this.logger.debug(`[getFilesForNote] userId=${userId} noteId=${noteId}`);

    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        note: true,
        folder: true,
      },
    });

    if (!folderNoteLink) {
      throw new NotFoundException('Note not found');
    }

    const files = await this.prisma.file.findMany({
      where: {
        noteId,
        deletedAt: null,
      },
      orderBy: {
        uploadedAt: 'desc',
      },
    });

    const filesWithUrls = await Promise.all(
      files.map(async (file) => {
        try {
          const signedUrl = await this.storageService.getSignedUrl(file.storageKey);
          return {
            id: file.id,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            url: signedUrl,
            uploadedAt: file.uploadedAt.toISOString(),
          };
        } catch (error) {
          this.logger.error(`[getFilesForNote] Failed to get signed URL for file ${file.id}:`, error);
          return {
            id: file.id,
            fileName: file.fileName,
            fileType: file.fileType,
            fileSize: file.fileSize,
            url: file.storageUrl,
            uploadedAt: file.uploadedAt.toISOString(),
          };
        }
      })
    );

    return filesWithUrls;
  }

  async updateNote(userId: string, noteId: string, dto: UpdateNoteDto) {
    this.logger.debug(`[updateNote] userId=${userId} noteId=${noteId}`);

    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
          deletedAt: null,
        },
        note: {
          deletedAt: null,
        },
      },
      include: {
        note: true,
      },
    });

    if (!folderNoteLink) {
      this.logger.warn(`[updateNote] Note not found or access denied: ${noteId}`);
      throw new NotFoundException('Note not found');
    }

    if (dto.folder_id && dto.folder_id !== folderNoteLink.folderId) {
      const newFolder = await this.prisma.folder.findFirst({
        where: {
          id: dto.folder_id,
          userId,
          deletedAt: null,
        },
      });

      if (!newFolder) {
        this.logger.warn(`[updateNote] New folder not found: ${dto.folder_id}`);
        throw new NotFoundException('New folder not found');
      }

      await this.prisma.folderLectureNote.delete({
        where: {
          folderId_noteId: {
            folderId: folderNoteLink.folderId,
            noteId,
          },
        },
      });

      await this.prisma.folderLectureNote.create({
        data: {
          folderId: dto.folder_id,
          noteId,
        },
      });
    }

    const updateData: {
      updatedAt: Date;
      title?: string;
    } = {
      updatedAt: new Date(),
    };

    if (dto.title) {
      updateData.title = dto.title;
    }

    const updatedNote = await this.prisma.lectureNote.update({
      where: { id: noteId },
      data: updateData,
    });

    this.logger.debug(`[updateNote] Updated note: ${noteId}`);

    const currentLink = await this.prisma.folderLectureNote.findFirst({
      where: { noteId },
    });

    return {
      id: updatedNote.id,
      title: updatedNote.title,
      folder_id: currentLink?.folderId || null,
      source_file_url: updatedNote.sourceFileUrl,
      audio_file_url: updatedNote.audioFileUrl,
      created_at: updatedNote.createdAt.toISOString(),
      updated_at: updatedNote.updatedAt.toISOString(),
    };
  }

  async deleteNote(userId: string, noteId: string) {
    this.logger.debug(`[deleteNote] userId=${userId} noteId=${noteId}`);

    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
          deletedAt: null,
        },
        note: {
          deletedAt: null,
        },
      },
    });

    if (!folderNoteLink) {
      this.logger.warn(`[deleteNote] Note not found or access denied: ${noteId}`);
      throw new NotFoundException('Note not found');
    }

    await this.prisma.lectureNote.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.debug(`[deleteNote] Deleted note: ${noteId}`);

    return { message: 'Note deleted successfully' };
  }
}

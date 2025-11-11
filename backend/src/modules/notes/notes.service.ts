import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  forwardRef,
  Inject,
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
    @Inject(forwardRef(() => FoldersService))
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

    // Check for duplicate note title in the same folder
    const existingNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        folderId: dto.folder_id,
        note: {
          title: dto.title,
          deletedAt: null,
        },
      },
      include: {
        note: true,
      },
    });

    if (existingNote) {
      this.logger.warn(`[createNote] Duplicate note title: ${dto.title} in folder: ${dto.folder_id}`);
      throw new ConflictException('A note with this title already exists in this folder');
    }

    const note = await this.prisma.lectureNote.create({
      data: {
        id: dto.id, // Use provided ID if available
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

    // Build storage path: users/{userNickname}/{folderPath}/{noteTitle}/
    const folderStoragePath = await this.foldersService.buildFolderStoragePath(userId, dto.folder_id);
    // Sanitize note title for file path
    const sanitizedTitle = encodeURIComponent(note.title)
      .replace(/%20/g, ' ')  // Keep spaces as spaces
      .replace(/%2F/g, '_')  // Replace / with _
      .replace(/%5C/g, '_'); // Replace \ with _
    const noteBasePath = `${folderStoragePath}/${sanitizedTitle}`;

    this.logger.debug(`[createNote] Note base storage path: ${noteBasePath}`);

    // Create .note file to mark this folder as a note folder
    try {
      const noteMetadata = {
        noteId: note.id,
        title: note.title,
        folderId: dto.folder_id,
        createdAt: note.createdAt.toISOString(),
        status: 'active',
        structure: {
          files: 'PDF, images, and general files',
          audio: 'Audio recordings',
          transcription: 'Transcription data (audio + subtitles)',
          typing: 'Slide-based typing/handwriting data',
        },
      };
      
      const metadataKey = `${noteBasePath}/.note`;
      await this.storageService.uploadBuffer(
        Buffer.from(JSON.stringify(noteMetadata, null, 2)),
        metadataKey,
        'application/json',
      );
      
      this.logger.log(`[createNote] ✅ Created .note file: ${metadataKey}`);
    } catch (error) {
      this.logger.error(`[createNote] Failed to create .note file:`, error);
      // Don't fail the request if metadata creation fails
    }

    // Create subdirectories by uploading placeholder .gitkeep files
    try {
      const subdirs = ['files', 'audio', 'transcription', 'typing'];
      for (const subdir of subdirs) {
        const placeholderKey = `${noteBasePath}/${subdir}/.gitkeep`;
        await this.storageService.uploadBuffer(
          Buffer.from(''),
          placeholderKey,
          'text/plain',
        );
        this.logger.debug(`[createNote] ✅ Created ${subdir}/ directory`);
      }
    } catch (error) {
      this.logger.error(`[createNote] Failed to create subdirectories:`, error);
      // Don't fail the request if subdirectory creation fails
    }

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

  async downloadFileAsBase64(userId: string, noteId: string, fileId: string) {
    this.logger.debug(`[downloadFileAsBase64] userId=${userId} noteId=${noteId} fileId=${fileId}`);

    // Verify access
    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNoteLink) {
      throw new NotFoundException('Note not found');
    }

    // Get file from database
    const file = await this.prisma.file.findFirst({
      where: {
        id: fileId,
        noteId,
        deletedAt: null,
      },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    try {
      // Get file from storage
      const { body, contentType } = await this.storageService.getFileStream(file.storageKey);
      
      // Convert to buffer
      let buffer: Buffer;
      
      if (Buffer.isBuffer(body)) {
        buffer = body;
      } else if ('transformToByteArray' in body && typeof body.transformToByteArray === 'function') {
        // S3 SDK stream - convert to buffer
        const uint8Array = await body.transformToByteArray();
        buffer = Buffer.from(uint8Array);
      } else if (body instanceof Blob) {
        // Blob type - convert to buffer
        const arrayBuffer = await body.arrayBuffer();
        buffer = Buffer.from(arrayBuffer);
      } else {
        // Try to convert to buffer
        buffer = Buffer.from(body as any);
      }

      // Return as JSON with base64-encoded data
      return {
        fileName: file.fileName,
        fileType: contentType || file.fileType,
        fileSize: buffer.length,
        data: buffer.toString('base64'),
      };
    } catch (error) {
      this.logger.error(`[downloadFileAsBase64] Failed to get file ${fileId}:`, error);
      throw new NotFoundException('File not accessible');
    }
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

    // Update .note file and rename folder if title or folder changed
    if (dto.title || dto.folder_id) {
      try {
        const targetFolderId = currentLink?.folderId || dto.folder_id;
        if (targetFolderId) {
          const folderStoragePath = await this.foldersService.buildFolderStoragePath(
            userId,
            targetFolderId,
          );
          
          // Build old and new note paths
          const oldTitle = folderNoteLink.note.title;
          const newTitle = updatedNote.title;
          
          const sanitizedOldTitle = encodeURIComponent(oldTitle)
            .replace(/%20/g, ' ')
            .replace(/%2F/g, '_')
            .replace(/%5C/g, '_');
          const sanitizedNewTitle = encodeURIComponent(newTitle)
            .replace(/%20/g, ' ')
            .replace(/%2F/g, '_')
            .replace(/%5C/g, '_');
          
          const oldNoteBasePath = `${folderStoragePath}/${sanitizedOldTitle}`;
          const newNoteBasePath = `${folderStoragePath}/${sanitizedNewTitle}`;
          
          // If title changed, rename the entire note folder in MinIO
          if (dto.title && oldTitle !== newTitle) {
            this.logger.debug(`[updateNote] Renaming note folder: ${oldNoteBasePath} -> ${newNoteBasePath}`);
            await this.storageService.renameFolder(oldNoteBasePath, newNoteBasePath);
            this.logger.log(`[updateNote] ✅ Renamed note folder in storage`);
          }
          
          // Update .note metadata file
          const metadataKey = `${newNoteBasePath}/.note`;
          const noteMetadata = {
            noteId: updatedNote.id,
            title: updatedNote.title,
            folderId: targetFolderId,
            createdAt: updatedNote.createdAt.toISOString(),
            updatedAt: updatedNote.updatedAt.toISOString(),
            status: 'active',
            structure: {
              files: 'PDF, images, and general files',
              audio: 'Audio recordings',
              transcription: 'Transcription data (audio + subtitles)',
              typing: 'Slide-based typing/handwriting data',
            },
          };
          
          await this.storageService.uploadBuffer(
            Buffer.from(JSON.stringify(noteMetadata, null, 2)),
            metadataKey,
            'application/json',
          );
          
          this.logger.log(`[updateNote] ✅ Updated .note file: ${metadataKey}`);
        }
      } catch (error) {
        this.logger.error(`[updateNote] Failed to update note in storage:`, error);
      }
    }

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
      include: {
        folder: true,
      },
    });

    if (!folderNoteLink) {
      this.logger.warn(`[deleteNote] Note not found or access denied: ${noteId}`);
      throw new NotFoundException('Note not found');
    }

    // Soft delete in PostgreSQL
    await this.prisma.lectureNote.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.debug(`[deleteNote] Soft deleted note in DB: ${noteId}`);

    // Rename .note file to .notex for soft delete in MinIO
    try {
      // Get note details to build correct path
      const noteDetails = await this.prisma.lectureNote.findUnique({
        where: { id: noteId },
        select: { title: true },
      });
      
      if (noteDetails) {
        const folderStoragePath = await this.foldersService.buildFolderStoragePath(
          userId,
          folderNoteLink.folderId,
        );
        
        const sanitizedTitle = encodeURIComponent(noteDetails.title)
          .replace(/%20/g, ' ')
          .replace(/%2F/g, '_')
          .replace(/%5C/g, '_');
        
        const noteBasePath = `${folderStoragePath}/${sanitizedTitle}`;
        const oldKey = `${noteBasePath}/.note`;
        const newKey = `${noteBasePath}/.notex`;
        
        await this.storageService.renameFile(oldKey, newKey);
        this.logger.log(`[deleteNote] ✅ Renamed .note to .notex: ${oldKey} → ${newKey}`);
      }
    } catch (error) {
      this.logger.error(`[deleteNote] Failed to rename .note to .notex:`, error);
      // Don't fail the request if rename fails
    }

    return { message: 'Note deleted successfully' };
  }

  /**
   * Delete all notes in a folder (soft delete) - used internally by folder deletion
   * @internal
   */
  async deleteNotesByFolder(userId: string, folderId: string): Promise<void> {
    this.logger.debug(`[deleteNotesByFolder] Deleting all notes in folder: ${folderId}`);

    // Find all notes in the folder
    const folderNoteLinks = await this.prisma.folderLectureNote.findMany({
      where: {
        folderId,
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

    this.logger.debug(`[deleteNotesByFolder] Found ${folderNoteLinks.length} notes to delete`);

    // Soft delete each note
    for (const link of folderNoteLinks) {
      try {
        // Soft delete in PostgreSQL
        await this.prisma.lectureNote.update({
          where: { id: link.noteId },
          data: {
            deletedAt: new Date(),
          },
        });

        this.logger.debug(`[deleteNotesByFolder] Soft deleted note in DB: ${link.noteId}`);

        // Rename .note file to .notex for soft delete in MinIO
        try {
          const folderStoragePath = await this.foldersService.buildFolderStoragePath(
            userId,
            folderId,
          );
          
          const sanitizedTitle = encodeURIComponent(link.note.title)
            .replace(/%20/g, ' ')
            .replace(/%2F/g, '_')
            .replace(/%5C/g, '_');
          
          const noteBasePath = `${folderStoragePath}/${sanitizedTitle}`;
          const oldKey = `${noteBasePath}/.note`;
          const newKey = `${noteBasePath}/.notex`;
          
          await this.storageService.renameFile(oldKey, newKey);
          this.logger.log(`[deleteNotesByFolder] ✅ Renamed .note to .notex: ${oldKey} → ${newKey}`);
        } catch (error) {
          this.logger.error(`[deleteNotesByFolder] Failed to rename .note to .notex for note ${link.noteId}:`, error);
          // Continue with other notes even if one fails
        }
      } catch (error) {
        this.logger.error(`[deleteNotesByFolder] Failed to delete note ${link.noteId}:`, error);
        // Continue with other notes even if one fails
      }
    }

    this.logger.log(`[deleteNotesByFolder] ✅ Completed deleting ${folderNoteLinks.length} notes in folder ${folderId}`);
  }
}

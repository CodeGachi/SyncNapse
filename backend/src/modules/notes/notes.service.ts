import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FoldersService } from '../folders/folders.service';
import { CreateNoteDto, UpdateNoteDto, NoteBlock, NoteContentPages } from './dto';

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
      type: link.note.type || 'student', // Include note type in response
      folder_id: link.folderId,
      source_file_url: link.note.sourceFileUrl,
      audio_file_url: link.note.audioFileUrl,
      created_at: link.note.createdAt.toISOString(),
      updated_at: link.note.updatedAt.toISOString(),
    }));
  }

  /**
   * Get the storage base path for a note
   * Returns the path in format: users/{userNickname}/{folderPath}/{noteTitle}
   */
  async getNoteStoragePath(userId: string, noteId: string): Promise<string> {
    this.logger.debug(`[getNoteStoragePath] userId=${userId} noteId=${noteId}`);

    // Get note with folder relationship
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
      },
      include: {
        note: true,
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Build folder storage path
    const folderStoragePath = await this.foldersService.buildFolderStoragePath(
      userId,
      folderNote.folderId,
    );

    // Sanitize note title
    const sanitizedTitle = encodeURIComponent(folderNote.note.title)
      .replace(/%20/g, ' ')
      .replace(/%2F/g, '_')
      .replace(/%5C/g, '_');

    const noteBasePath = `${folderStoragePath}/${sanitizedTitle}`;
    
    this.logger.debug(`[getNoteStoragePath] noteBasePath=${noteBasePath}`);
    return noteBasePath;
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
      type: folderNoteLink.note.type || 'student', // Include note type in response
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

    // Handle "root" folder ID - find or create root folder
    let actualFolderId = dto.folder_id;
    
    if (dto.folder_id === 'root' || !dto.folder_id) {
      this.logger.debug(`[createNote] Finding or creating root folder for user: ${userId}`);
      
      // Find root folder (parentId is null)
      let rootFolder = await this.prisma.folder.findFirst({
        where: {
          userId,
          parentId: null,
          deletedAt: null,
        },
      });
      
      // Create root folder if not exists
      if (!rootFolder) {
        this.logger.debug(`[createNote] Creating root folder for user: ${userId}`);
        rootFolder = await this.prisma.folder.create({
          data: {
            name: 'Root',
            userId,
            parentId: null,
          },
        });
        this.logger.log(`[createNote] ✅ Created root folder: ${rootFolder.id}`);
      }
      
      actualFolderId = rootFolder.id;
      this.logger.debug(`[createNote] Using root folder ID: ${actualFolderId}`);
    }

    const folder = await this.prisma.folder.findFirst({
      where: {
        id: actualFolderId,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      this.logger.warn(`[createNote] Folder not found: ${actualFolderId}`);
      throw new NotFoundException('Folder not found');
    }

    // Check for duplicate note title in the same folder
    const existingNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        folderId: actualFolderId, // Use actualFolderId for duplicate check
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
      this.logger.warn(`[createNote] Duplicate note title: ${dto.title} in folder: ${actualFolderId}`);
      throw new ConflictException('A note with this title already exists in this folder');
    }

    const note = await this.prisma.lectureNote.create({
      data: {
        id: dto.id, // Use provided ID if available
        title: dto.title,
        type: dto.type || 'student', // Default to 'student' if not provided
        sourceFileUrl: files.length > 0 ? `temp://${files[0].originalname}` : null,
      },
    });

    await this.prisma.folderLectureNote.create({
      data: {
        folderId: actualFolderId, // Use actualFolderId instead of dto.folder_id
        noteId: note.id,
      },
    });

    this.logger.debug(`[createNote] Created note: ${note.id}`);

    // Build storage path: users/{userNickname}/{folderPath}/{noteTitle}/
    const folderStoragePath = await this.foldersService.buildFolderStoragePath(userId, actualFolderId);
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
      type: note.type || 'student', // Include note type in response
      folder_id: actualFolderId, // Return the actual folder ID used
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
        // Try to convert to buffer (string or other types)
        buffer = Buffer.from(String(body));
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

    // Move entire note folder to .deleted archive for soft delete
    try {
      const folderStoragePath = await this.foldersService.buildFolderStoragePath(
        userId,
        folderNoteLink.folderId,
      );

      // Get actual folder name from file storageKey (handles restored notes with timestamp)
      const files = await this.prisma.file.findMany({
        where: { noteId },
        select: { storageKey: true },
        take: 1,
      });

      let actualFolderName: string | null = null;

      if (files.length > 0 && files[0].storageKey) {
        // Extract folder name from storageKey
        // Example: "users/email/folder/NoteTitle_123456/files/file.pdf"
        //          -> "NoteTitle_123456"
        const parts = files[0].storageKey.split('/');
        const filesIndex = parts.indexOf('files');
        if (filesIndex > 0) {
          actualFolderName = parts[filesIndex - 1];
        }
      }

      // Fallback to DB title if no files found
      if (!actualFolderName) {
        const noteDetails = await this.prisma.lectureNote.findUnique({
          where: { id: noteId },
          select: { title: true },
        });

        if (!noteDetails) {
          this.logger.warn(`[deleteNote] Note not found: ${noteId}`);
          return { message: 'Note deleted successfully' };
        }

        actualFolderName = encodeURIComponent(noteDetails.title)
          .replace(/%20/g, ' ')
          .replace(/%2F/g, '_')
          .replace(/%5C/g, '_');
      }

      // Source: current note folder (with actual name including timestamp if restored)
      const noteBasePath = `${folderStoragePath}/${actualFolderName}`;

      // Destination: .deleted folder with new timestamp
      const timestamp = Date.now();
      const archivedPath = `${folderStoragePath}/.deleted/${actualFolderName}_${timestamp}`;

      this.logger.log(`[deleteNote] 📦 Moving note to archive: ${noteBasePath} → ${archivedPath}`);

      // Move entire folder (includes .note, files/, audio/, transcription/, typing/)
      await this.storageService.renameFolder(noteBasePath, archivedPath);

      this.logger.log(`[deleteNote] ✅ Archived note folder to .deleted: ${archivedPath}`);
    } catch (error) {
      this.logger.error(`[deleteNote] Failed to archive note folder:`, error);
      // Don't fail the request if archiving fails
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

        // Move entire note folder to .deleted archive for soft delete
        try {
          const folderStoragePath = await this.foldersService.buildFolderStoragePath(
            userId,
            folderId,
          );

          // Get actual folder name from file storageKey (handles restored notes with timestamp)
          const files = await this.prisma.file.findMany({
            where: { noteId: link.noteId },
            select: { storageKey: true },
            take: 1,
          });

          let actualFolderName: string | null = null;

          if (files.length > 0 && files[0].storageKey) {
            // Extract folder name from storageKey
            const parts = files[0].storageKey.split('/');
            const filesIndex = parts.indexOf('files');
            if (filesIndex > 0) {
              actualFolderName = parts[filesIndex - 1];
            }
          }

          // Fallback to DB title if no files found
          if (!actualFolderName) {
            actualFolderName = encodeURIComponent(link.note.title)
              .replace(/%20/g, ' ')
              .replace(/%2F/g, '_')
              .replace(/%5C/g, '_');
          }
          
          // Source: current note folder (with actual name including timestamp if restored)
          const noteBasePath = `${folderStoragePath}/${actualFolderName}`;
          
          // Destination: .deleted folder with new timestamp
          const timestamp = Date.now();
          const archivedPath = `${folderStoragePath}/.deleted/${actualFolderName}_${timestamp}`;
          
          this.logger.log(`[deleteNotesByFolder] 📦 Moving note to archive: ${noteBasePath} → ${archivedPath}`);
          
          // Move entire folder (includes .note, files/, audio/, transcription/, typing/)
          await this.storageService.renameFolder(noteBasePath, archivedPath);
          
          this.logger.log(`[deleteNotesByFolder] ✅ Archived note folder to .deleted: ${archivedPath}`);
        } catch (error) {
          this.logger.error(`[deleteNotesByFolder] Failed to archive note folder for note ${link.noteId}:`, error);
          // Continue with other notes even if one fails
        }
      } catch (error) {
        this.logger.error(`[deleteNotesByFolder] Failed to delete note ${link.noteId}:`, error);
        // Continue with other notes even if one fails
      }
    }

    this.logger.log(`[deleteNotesByFolder] ✅ Completed deleting ${folderNoteLinks.length} notes in folder ${folderId}`);
  }

  /**
   * Save or update page content (blocks)
   */
  async savePageContent(
    userId: string,
    noteId: string,
    pageNumber: number,
    blocks: NoteBlock[],
  ) {
    this.logger.debug(`[savePageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNumber} blocks=${blocks.length}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        note: true,
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Find or create MaterialPage
    let materialPage = await this.prisma.materialPage.findFirst({
      where: {
        noteId,
        pageNumber,
      },
    });

    if (!materialPage) {
      materialPage = await this.prisma.materialPage.create({
        data: {
          noteId,
          pageNumber,
        },
      });
      this.logger.log(`[savePageContent] Created MaterialPage for page ${pageNumber}`);
    }

    // Build storage key for MinIO backup (typing section)
    const noteBasePath = await this.getNoteStoragePath(userId, noteId);
    const storageKey = `${noteBasePath}/typing/page_${pageNumber}_content.json`;

    // Save to MinIO
    try {
      const contentData = {
        noteId,
        pageNumber,
        blocks,
        version: 1,
        savedAt: new Date().toISOString(),
      };

      await this.storageService.uploadBuffer(
        Buffer.from(JSON.stringify(contentData, null, 2)),
        storageKey,
        'application/json',
      );

      this.logger.log(`[savePageContent] ✅ Saved to MinIO: ${storageKey}`);
    } catch (error) {
      this.logger.error(`[savePageContent] Failed to save to MinIO:`, error);
      // Continue even if MinIO fails
    }

    // Upsert PageContent
    const pageContent = await this.prisma.pageContent.upsert({
      where: {
        pageId: materialPage.id,
      },
      update: {
        blocks: blocks as unknown as Prisma.InputJsonValue,
        storageKey,
        updatedAt: new Date(),
      },
      create: {
        noteId,
        pageId: materialPage.id,
        pageNumber,
        blocks: blocks as unknown as Prisma.InputJsonValue,
        storageKey,
      },
    });

    this.logger.log(`[savePageContent] ✅ Saved PageContent: ${pageContent.id}`);
    return pageContent;
  }

  /**
   * Get page content by note ID and page number
   */
  async getPageContent(userId: string, noteId: string, pageNumber: number) {
    this.logger.debug(`[getPageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNumber}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Find MaterialPage
    const materialPage = await this.prisma.materialPage.findFirst({
      where: {
        noteId,
        pageNumber,
      },
      include: {
        pageContent: true,
      },
    });

    if (!materialPage || !materialPage.pageContent) {
      // Return empty blocks if no content exists
      return {
        noteId,
        pageNumber,
        blocks: [],
        version: 1,
      };
    }

    return {
      id: materialPage.pageContent.id,
      noteId: materialPage.pageContent.noteId,
      pageNumber: materialPage.pageContent.pageNumber,
      blocks: materialPage.pageContent.blocks,
      version: materialPage.pageContent.version,
      createdAt: materialPage.pageContent.createdAt,
      updatedAt: materialPage.pageContent.updatedAt,
    };
  }

  /**
   * Delete page content
   */
  async deletePageContent(userId: string, noteId: string, pageNumber: number) {
    this.logger.debug(`[deletePageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNumber}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Find MaterialPage
    const materialPage = await this.prisma.materialPage.findFirst({
      where: {
        noteId,
        pageNumber,
      },
      include: {
        pageContent: true,
      },
    });

    if (!materialPage || !materialPage.pageContent) {
      throw new NotFoundException(`Page content not found for page ${pageNumber}`);
    }

    // Delete from MinIO if storage key exists
    if (materialPage.pageContent.storageKey) {
      try {
        await this.storageService.deleteFile(materialPage.pageContent.storageKey);
        this.logger.log(`[deletePageContent] ✅ Deleted from MinIO: ${materialPage.pageContent.storageKey}`);
      } catch (error) {
        this.logger.error(`[deletePageContent] Failed to delete from MinIO:`, error);
      }
    }

    // Delete PageContent from database
    await this.prisma.pageContent.delete({
      where: {
        id: materialPage.pageContent.id,
      },
    });

    this.logger.log(`[deletePageContent] ✅ Deleted PageContent for page ${pageNumber}`);
  }

  /**
   * Save entire note content (all pages in a single document)
   */
  async saveNoteContent(
    userId: string,
    noteId: string,
    pages: NoteContentPages,
  ) {
    this.logger.debug(`[saveNoteContent] userId=${userId} noteId=${noteId} pages=${Object.keys(pages).length}`);
    
    // Debug: Log the first page's structure and content
    const firstPageKey = Object.keys(pages)[0];
    if (firstPageKey && pages[firstPageKey]) {
      const firstPage = pages[firstPageKey];
      this.logger.debug(`[saveNoteContent] 🔍 First page (${firstPageKey}) structure:`, {
        hasBlocks: !!firstPage.blocks,
        blocksIsArray: Array.isArray(firstPage.blocks),
        blockCount: firstPage.blocks?.length || 0,
        firstBlock: firstPage.blocks?.[0],
        firstBlockContent: firstPage.blocks?.[0]?.content,
        firstBlockType: firstPage.blocks?.[0]?.type,
        allBlocks: firstPage.blocks,
      });
    }

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
      include: {
        note: true,
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Build storage key for MinIO backup
    const noteBasePath = await this.getNoteStoragePath(userId, noteId);
    const storageKey = `${noteBasePath}/typing/note_content.json`;

    // Save to MinIO
    try {
      const contentData = {
        noteId,
        pages,
        version: 1,
        savedAt: new Date().toISOString(),
      };
      
      // Debug: Log what we're about to save to MinIO
      const firstPageKeyForMinIO = Object.keys(contentData.pages)[0];
      if (firstPageKeyForMinIO && contentData.pages[firstPageKeyForMinIO]) {
        const firstPageForMinIO = contentData.pages[firstPageKeyForMinIO];
        this.logger.debug(`[saveNoteContent] 💾 About to save to MinIO - First page (${firstPageKeyForMinIO}):`, {
          blockCount: firstPageForMinIO.blocks?.length || 0,
          firstBlockContent: firstPageForMinIO.blocks?.[0]?.content,
          firstBlockType: firstPageForMinIO.blocks?.[0]?.type,
          allBlocks: firstPageForMinIO.blocks,
        });
      }

      await this.storageService.uploadBuffer(
        Buffer.from(JSON.stringify(contentData, null, 2)),
        storageKey,
        'application/json',
      );

      this.logger.log(`[saveNoteContent] ✅ Saved to MinIO: ${storageKey}`);
    } catch (error) {
      this.logger.error(`[saveNoteContent] Failed to save to MinIO:`, error);
      // Continue even if MinIO fails
    }

    // Upsert NoteContent
    const noteContent = await this.prisma.noteContent.upsert({
      where: {
        noteId,
      },
      update: {
        content: { pages } as unknown as Prisma.JsonObject,
        storageKey,
        updatedAt: new Date(),
      },
      create: {
        noteId,
        content: { pages } as unknown as Prisma.JsonObject,
        storageKey,
        version: 1,
      },
    });

    this.logger.log(`[saveNoteContent] ✅ Saved NoteContent: ${noteContent.id}`);
    return noteContent;
  }

  /**
   * Get entire note content
   */
  async getNoteContent(userId: string, noteId: string) {
    this.logger.log(`[getNoteContent] 🔍 START - userId=${userId} noteId=${noteId}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      this.logger.warn(`[getNoteContent] ❌ Note not found: ${noteId}`);
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    this.logger.log(`[getNoteContent] ✅ Note ownership verified`);

    // Get NoteContent
    const noteContent = await this.prisma.noteContent.findUnique({
      where: {
        noteId,
      },
    });

    if (!noteContent) {
      this.logger.warn(`[getNoteContent] ⚠️ No content in PostgreSQL for note: ${noteId}`);
      
      // Try to load from MinIO as fallback
      try {
        const noteBasePath = await this.getNoteStoragePath(userId, noteId);
        const storageKey = `${noteBasePath}/typing/note_content.json`;
        
        this.logger.log(`[getNoteContent] 🔄 Trying MinIO fallback: ${storageKey}`);
        const { body } = await this.storageService.getFileStream(storageKey);
        
        // Convert body to buffer
        let minioBuffer: Buffer;
        if (Buffer.isBuffer(body)) {
          minioBuffer = body;
        } else {
          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          minioBuffer = Buffer.concat(chunks);
        }
        
        const minioContent = JSON.parse(minioBuffer.toString('utf-8'));
        
        this.logger.log(`[getNoteContent] ✅ Loaded from MinIO:`, {
          hasPages: !!minioContent.pages,
          pageCount: Object.keys(minioContent.pages || {}).length,
        });
        
        return {
          noteId,
          pages: minioContent.pages || {},
          version: minioContent.version || 1,
        };
      } catch (minioError) {
        const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
        this.logger.warn(`[getNoteContent] ⚠️ MinIO fallback failed: ${errorMessage}`);
        // Return empty structure if both DB and MinIO fail
        return {
          noteId,
          pages: {},
          version: 1,
        };
      }
    }

    this.logger.log(`[getNoteContent] 📋 Found NoteContent record: ${noteContent.id}`);
    this.logger.log(`[getNoteContent] 🔍 Raw content type: ${typeof noteContent.content}`);
    this.logger.log(`[getNoteContent] 🔍 Raw content keys: ${JSON.stringify(Object.keys(noteContent.content || {}))}`);

    const content = noteContent.content as unknown as { pages: NoteContentPages };
    
    // Debug: Log content structure
    if (!content) {
      this.logger.error(`[getNoteContent] ❌ Content is null or undefined!`);
      
      // Try MinIO fallback
      try {
        const noteBasePath = await this.getNoteStoragePath(userId, noteId);
        const storageKey = `${noteBasePath}/typing/note_content.json`;
        
        this.logger.log(`[getNoteContent] 🔄 Content null, trying MinIO: ${storageKey}`);
        const { body } = await this.storageService.getFileStream(storageKey);
        
        // Convert body to buffer
        let minioBuffer: Buffer;
        if (Buffer.isBuffer(body)) {
          minioBuffer = body;
        } else {
          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          minioBuffer = Buffer.concat(chunks);
        }
        
        const minioContent = JSON.parse(minioBuffer.toString('utf-8'));
        
        this.logger.log(`[getNoteContent] ✅ Loaded from MinIO:`, {
          hasPages: !!minioContent.pages,
          pageCount: Object.keys(minioContent.pages || {}).length,
        });
        
        return {
          id: noteContent.id,
          noteId: noteContent.noteId,
          pages: minioContent.pages || {},
          version: minioContent.version || noteContent.version,
          storageKey: noteContent.storageKey,
          createdAt: noteContent.createdAt,
          updatedAt: noteContent.updatedAt,
        };
      } catch (minioError) {
        const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
        this.logger.warn(`[getNoteContent] ⚠️ MinIO fallback failed: ${errorMessage}`);
        return {
          noteId,
          pages: {},
          version: 1,
        };
      }
    }

    if (!content.pages || Object.keys(content.pages).length === 0) {
      this.logger.error(`[getNoteContent] ❌ Content.pages is missing or empty!`);
      this.logger.error(`[getNoteContent] Content structure:`, JSON.stringify(content, null, 2));
      
      // Try MinIO fallback
      try {
        const noteBasePath = await this.getNoteStoragePath(userId, noteId);
        const storageKey = `${noteBasePath}/typing/note_content.json`;
        
        this.logger.log(`[getNoteContent] 🔄 Pages empty, trying MinIO: ${storageKey}`);
        const { body } = await this.storageService.getFileStream(storageKey);
        
        // Convert body to buffer
        let minioBuffer: Buffer;
        if (Buffer.isBuffer(body)) {
          minioBuffer = body;
        } else {
          // Convert stream to buffer
          const chunks: Uint8Array[] = [];
          for await (const chunk of body as AsyncIterable<Uint8Array>) {
            chunks.push(chunk);
          }
          minioBuffer = Buffer.concat(chunks);
        }
        
        const minioContent = JSON.parse(minioBuffer.toString('utf-8'));
        
        const minioPageKeys = Object.keys(minioContent.pages || {});
        this.logger.log(`[getNoteContent] ✅ Loaded from MinIO: ${minioPageKeys.length} pages`);
        
        return {
          id: noteContent.id,
          noteId: noteContent.noteId,
          pages: minioContent.pages || {},
          version: minioContent.version || noteContent.version,
          storageKey: noteContent.storageKey,
          createdAt: noteContent.createdAt,
          updatedAt: noteContent.updatedAt,
        };
      } catch (minioError) {
        const errorMessage = minioError instanceof Error ? minioError.message : String(minioError);
        this.logger.warn(`[getNoteContent] ⚠️ MinIO fallback failed: ${errorMessage}`);
        return {
          noteId,
          pages: {},
          version: 1,
        };
      }
    }

    const pageKeys = Object.keys(content.pages || {});
    this.logger.log(`[getNoteContent] 📄 Found ${pageKeys.length} pages: ${pageKeys.join(', ')}`);
    
    // Debug: Log what we loaded from DB
    const firstPageKeyFromDB = pageKeys[0];
    if (firstPageKeyFromDB && content.pages[firstPageKeyFromDB]) {
      const firstPageFromDB = content.pages[firstPageKeyFromDB];
      this.logger.log(`[getNoteContent] 📖 First page (${firstPageKeyFromDB}) structure:`, {
        hasBlocks: !!firstPageFromDB.blocks,
        blocksIsArray: Array.isArray(firstPageFromDB.blocks),
        blockCount: firstPageFromDB.blocks?.length || 0,
        firstBlockContent: firstPageFromDB.blocks?.[0]?.content,
        firstBlockType: firstPageFromDB.blocks?.[0]?.type,
      });
    }

    const result = {
      id: noteContent.id,
      noteId: noteContent.noteId,
      pages: content.pages || {},
      version: noteContent.version,
      storageKey: noteContent.storageKey,
      createdAt: noteContent.createdAt,
      updatedAt: noteContent.updatedAt,
    };
    
    // Debug: Log what we're returning
    const resultPageKeys = Object.keys(result.pages || {});
    this.logger.log(`[getNoteContent] ✅ Returning ${resultPageKeys.length} pages`);
    
    const firstPageKeyResult = resultPageKeys[0];
    if (firstPageKeyResult && result.pages[firstPageKeyResult]) {
      const firstPageResult = result.pages[firstPageKeyResult];
      this.logger.log(`[getNoteContent] 📤 First page in result (${firstPageKeyResult}):`, {
        hasBlocks: !!firstPageResult.blocks,
        blocksIsArray: Array.isArray(firstPageResult.blocks),
        blockCount: firstPageResult.blocks?.length || 0,
        firstBlockContent: firstPageResult.blocks?.[0]?.content,
        firstBlockType: firstPageResult.blocks?.[0]?.type,
      });
    }
    
    return result;
  }

  /**
   * Delete entire note content
   */
  async deleteNoteContent(userId: string, noteId: string) {
    this.logger.debug(`[deleteNoteContent] userId=${userId} noteId=${noteId}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: {
          deletedAt: null,
        },
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Get NoteContent
    const noteContent = await this.prisma.noteContent.findUnique({
      where: {
        noteId,
      },
    });

    if (!noteContent) {
      throw new NotFoundException(`Note content not found for note ${noteId}`);
    }

    // Delete from MinIO if storage key exists
    if (noteContent.storageKey) {
      try {
        await this.storageService.deleteFile(noteContent.storageKey);
        this.logger.log(`[deleteNoteContent] ✅ Deleted from MinIO: ${noteContent.storageKey}`);
      } catch (error) {
        this.logger.error(`[deleteNoteContent] Failed to delete from MinIO:`, error);
      }
    }

    // Delete NoteContent from database
    await this.prisma.noteContent.delete({
      where: {
        id: noteContent.id,
      },
    });

    this.logger.log(`[deleteNoteContent] ✅ Deleted NoteContent for note ${noteId}`);
  }

  /**
   * Get all trashed (soft-deleted) notes for a user
   */
  async getTrashedNotes(userId: string) {
    this.logger.debug(`[getTrashedNotes] Getting trashed notes for userId: ${userId}`);

    // Get all soft-deleted notes for the user
    const trashedNotes = await this.prisma.folderLectureNote.findMany({
      where: {
        folder: {
          userId,
        },
        note: {
          deletedAt: {
            not: null,
          },
        },
      },
      include: {
        note: true,
        folder: true,
      },
      orderBy: {
        note: {
          deletedAt: 'desc', // Most recently deleted first
        },
      },
    });

    this.logger.log(`[getTrashedNotes] Found ${trashedNotes.length} trashed notes`);

    return trashedNotes.map((link) => ({
      id: link.note.id,
      title: link.note.title,
      type: link.note.type || 'student',
      folder_id: link.folderId,
      folder_name: link.folder.name,
      deleted_at: link.note.deletedAt?.toISOString(),
      created_at: link.note.createdAt.toISOString(),
    }));
  }

  /**
   * Restore a trashed note
   * Moves the note folder from .deleted back to active location with timestamp in name
   */
  async restoreNote(userId: string, noteId: string) {
    this.logger.debug(`[restoreNote] Restoring note: ${noteId} for userId: ${userId}`);

    // Find the note
    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
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

    // Check if note is actually deleted
    if (!folderNoteLink.note.deletedAt) {
      throw new ConflictException('Note is not in trash');
    }

    // Restore in database (remove deletedAt)
    await this.prisma.lectureNote.update({
      where: { id: noteId },
      data: {
        deletedAt: null,
      },
    });

    this.logger.log(`[restoreNote] ✅ Restored note in database: ${noteId}`);

    // Move folder from .deleted back to active location with timestamp in name
    try {
      const folderStoragePath = await this.foldersService.buildFolderStoragePath(
        userId,
        folderNoteLink.folderId,
      );

      const sanitizedTitle = encodeURIComponent(folderNoteLink.note.title)
        .replace(/%20/g, ' ')
        .replace(/%2F/g, '_')
        .replace(/%5C/g, '_');

      // Find the archived folder in .deleted (it should have a timestamp)
      // We need to search for it since we don't know the exact timestamp
      const deletedFolderPrefix = `${folderStoragePath}/.deleted/${sanitizedTitle}_`;
      
      this.logger.debug(`[restoreNote] Searching for archived folder with prefix: ${deletedFolderPrefix}`);

      // List all folders in .deleted to find the right one
      const archivedFolders = await this.storageService.listFolders(`${folderStoragePath}/.deleted/`);
      const matchingFolder = archivedFolders.find(folder => folder.startsWith(`${sanitizedTitle}_`));

      if (!matchingFolder) {
        this.logger.warn(`[restoreNote] Archived folder not found for note: ${noteId}`);
        return {
          id: noteId,
          message: 'Note restored in database, but archived folder not found in storage',
        };
      }

      const archivedPath = `${folderStoragePath}/.deleted/${matchingFolder}`;
      
      // Restore with timestamp in the name (keep the timestamp from deletion)
      const restoredPath = `${folderStoragePath}/${matchingFolder}`;

      this.logger.log(`[restoreNote] 📦 Moving from archive: ${archivedPath} → ${restoredPath}`);

      await this.storageService.renameFolder(archivedPath, restoredPath);

      this.logger.log(`[restoreNote] ✅ Restored note folder from .deleted: ${restoredPath}`);

      // Update file and note content storageKeys to match new folder path
      try {
        const oldFolderName = sanitizedTitle;
        const newFolderName = matchingFolder;

        // Update files
        const files = await this.prisma.file.findMany({
          where: { noteId },
        });

        if (files.length > 0) {
          this.logger.log(`[restoreNote] 📁 Updating ${files.length} file paths...`);

          for (const file of files) {
            if (file.storageKey) {
              // Old path: users/email/folder/NoteTitle/files/...
              // New path: users/email/folder/NoteTitle_timestamp/files/...
              const newStorageKey = file.storageKey.replace(
                `/${oldFolderName}/`,
                `/${newFolderName}/`
              );

              if (newStorageKey !== file.storageKey) {
                await this.prisma.file.update({
                  where: { id: file.id },
                  data: { storageKey: newStorageKey },
                });
                this.logger.debug(`[restoreNote] Updated file path: ${file.fileName}`);
              }
            }
          }

          this.logger.log(`[restoreNote] ✅ Updated all file paths`);
        }

        // Update note content
        const noteContent = await this.prisma.noteContent.findFirst({
          where: { noteId },
        });

        if (noteContent && noteContent.storageKey) {
          const newContentStorageKey = noteContent.storageKey.replace(
            `/${oldFolderName}/`,
            `/${newFolderName}/`
          );

          if (newContentStorageKey !== noteContent.storageKey) {
            await this.prisma.noteContent.update({
              where: { id: noteContent.id },
              data: { storageKey: newContentStorageKey },
            });
            this.logger.log(`[restoreNote] ✅ Updated note content path`);
          }
        }
      } catch (fileError) {
        this.logger.error(`[restoreNote] Failed to update storage paths:`, fileError);
        // Continue - note is restored, just file paths might be wrong
      }

      return {
        id: noteId,
        title: matchingFolder, // Return the full name with timestamp
        message: 'Note restored successfully with timestamp',
      };
    } catch (error) {
      this.logger.error(`[restoreNote] Failed to restore note folder:`, error);
      
      // Note is already restored in database, so partial success
      return {
        id: noteId,
        message: 'Note restored in database, but failed to restore folder from storage',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Permanently delete a trashed note (hard delete)
   * Deletes the note from database and removes the archived folder from .deleted
   */
  async permanentlyDeleteNote(userId: string, noteId: string) {
    this.logger.debug(`[permanentlyDeleteNote] Permanently deleting note: ${noteId} for userId: ${userId}`);

    // Find the note
    const folderNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        folder: {
          userId,
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

    // Check if note is actually deleted
    if (!folderNoteLink.note.deletedAt) {
      throw new ConflictException('Note is not in trash. Please delete it first before permanent deletion.');
    }

    // Delete archived folder from .deleted in storage
    try {
      const folderStoragePath = await this.foldersService.buildFolderStoragePath(
        userId,
        folderNoteLink.folderId,
      );

      const sanitizedTitle = encodeURIComponent(folderNoteLink.note.title)
        .replace(/%20/g, ' ')
        .replace(/%2F/g, '_')
        .replace(/%5C/g, '_');

      // Find the archived folder in .deleted
      this.logger.debug(`[permanentlyDeleteNote] Searching for archived folder in .deleted`);

      const archivedFolders = await this.storageService.listFolders(`${folderStoragePath}/.deleted/`);
      const matchingFolder = archivedFolders.find(folder => folder.startsWith(`${sanitizedTitle}_`));

      if (matchingFolder) {
        const archivedPath = `${folderStoragePath}/.deleted/${matchingFolder}`;
        
        this.logger.log(`[permanentlyDeleteNote] 🗑️ Deleting archived folder: ${archivedPath}`);

        // Delete entire folder recursively
        await this.storageService.deleteFolderRecursively(archivedPath);

        this.logger.log(`[permanentlyDeleteNote] ✅ Deleted archived folder from storage`);
      } else {
        this.logger.warn(`[permanentlyDeleteNote] Archived folder not found for note: ${noteId}`);
      }
    } catch (error) {
      this.logger.error(`[permanentlyDeleteNote] Failed to delete archived folder:`, error);
      // Continue with database deletion even if storage deletion fails
    }

    // Delete related files from database
    try {
      const deletedFiles = await this.prisma.file.deleteMany({
        where: {
          noteId,
        },
      });
      this.logger.log(`[permanentlyDeleteNote] ✅ Deleted ${deletedFiles.count} related files from database`);
    } catch (error) {
      this.logger.error(`[permanentlyDeleteNote] Failed to delete related files:`, error);
    }

    // Delete note content from database
    try {
      const noteContent = await this.prisma.noteContent.findFirst({
        where: {
          noteId,
        },
      });

      if (noteContent) {
        await this.prisma.noteContent.delete({
          where: {
            id: noteContent.id,
          },
        });
        this.logger.log(`[permanentlyDeleteNote] ✅ Deleted note content from database`);
      }
    } catch (error) {
      this.logger.error(`[permanentlyDeleteNote] Failed to delete note content:`, error);
    }

    // Delete folder-note link
    await this.prisma.folderLectureNote.delete({
      where: {
        folderId_noteId: {
          folderId: folderNoteLink.folderId,
          noteId,
        },
      },
    });

    this.logger.log(`[permanentlyDeleteNote] ✅ Deleted folder-note link`);

    // Delete note from database (hard delete)
    await this.prisma.lectureNote.delete({
      where: { id: noteId },
    });

    this.logger.log(`[permanentlyDeleteNote] ✅ Permanently deleted note from database: ${noteId}`);

    return {
      id: noteId,
      message: 'Note permanently deleted successfully',
    };
  }
}

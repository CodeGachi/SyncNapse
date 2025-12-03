import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  forwardRef,
  Inject,
  InternalServerErrorException,
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
  ) { }

  /**
   * Check if user has access to note (owner, collaborator, or public access)
   * Returns true if user has access, false otherwise
   */
  async checkNoteAccess(userId: string, noteId: string): Promise<boolean> {
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

    // First, try to find as owner
    let folderNoteLink = await this.prisma.folderLectureNote.findFirst({
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

    const isOwner = !!folderNoteLink;

    // If not owner, check for shared access
    if (!folderNoteLink) {
      this.logger.debug(`[getNote] User is not owner, checking shared access...`);

      // Get note with any folder link
      folderNoteLink = await this.prisma.folderLectureNote.findFirst({
        where: {
          noteId,
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
        this.logger.warn(`[getNote] Note not found: ${noteId}`);
        throw new NotFoundException('Note not found');
      }

      // Check if user has access via collaborator or public access
      const note = folderNoteLink.note;

      // Check collaborator access
      const collaborator = await this.prisma.noteCollaborator.findFirst({
        where: {
          noteId,
          OR: [
            { userId },
            { email: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email },
          ],
        },
      });

      const hasCollaboratorAccess = !!collaborator;
      const hasPublicAccess = note.publicAccess === 'PUBLIC_READ' || note.publicAccess === 'PUBLIC_EDIT';

      if (!hasCollaboratorAccess && !hasPublicAccess) {
        this.logger.warn(`[getNote] Access denied for user ${userId} to note ${noteId}`);
        throw new NotFoundException('Note not found');
      }

      this.logger.debug(`[getNote] Shared access granted: collaborator=${hasCollaboratorAccess}, public=${hasPublicAccess}`);
    }

    return {
      id: folderNoteLink.note.id,
      title: folderNoteLink.note.title,
      type: folderNoteLink.note.type || 'student',
      folder_id: isOwner ? folderNoteLink.folderId : null, // Don't expose folder_id to non-owners
      source_file_url: folderNoteLink.note.sourceFileUrl,
      audio_file_url: folderNoteLink.note.audioFileUrl,
      public_access: folderNoteLink.note.publicAccess,
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

    // Use transaction for DB operations
    const note = await this.prisma.$transaction(async (prisma) => {
      // Re-check duplicate inside transaction to minimize race condition window
      const existingNote = await prisma.folderLectureNote.findFirst({
        where: {
          folderId: actualFolderId,
          note: {
            title: dto.title,
            deletedAt: null,
          },
        },
      });

      if (existingNote) {
        throw new ConflictException('A note with this title already exists in this folder');
      }

      const createdNote = await prisma.lectureNote.create({
        data: {
          id: dto.id, // Use provided ID if available
          title: dto.title,
          type: dto.type || 'student', // Default to 'student' if not provided
          sourceFileUrl: files.length > 0 ? `temp://${files[0].originalname}` : null,
        },
      });

      await prisma.folderLectureNote.create({
        data: {
          folderId: actualFolderId, // Use actualFolderId instead of dto.folder_id
          noteId: createdNote.id,
        },
      });
      
      return createdNote;
    });

    this.logger.debug(`[createNote] Created note in DB: ${note.id}`);

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

    // First, try to find as owner
    let folderNoteLink = await this.prisma.folderLectureNote.findFirst({
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

    // If not owner, check for shared access
    if (!folderNoteLink) {
      this.logger.debug(`[getFilesForNote] User is not owner, checking shared access...`);

      folderNoteLink = await this.prisma.folderLectureNote.findFirst({
        where: {
          noteId,
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
        throw new NotFoundException('Note not found');
      }

      // Check collaborator or public access
      const note = folderNoteLink.note;
      const collaborator = await this.prisma.noteCollaborator.findFirst({
        where: {
          noteId,
          OR: [
            { userId },
            { email: (await this.prisma.user.findUnique({ where: { id: userId } }))?.email },
          ],
        },
      });

      const hasCollaboratorAccess = !!collaborator;
      const hasPublicAccess = note.publicAccess === 'PUBLIC_READ' || note.publicAccess === 'PUBLIC_EDIT';

      if (!hasCollaboratorAccess && !hasPublicAccess) {
        this.logger.warn(`[getFilesForNote] Access denied for user ${userId} to note ${noteId}`);
        throw new NotFoundException('Note not found');
      }

      this.logger.debug(`[getFilesForNote] Shared access granted`);
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

    // Verify access (owner, collaborator, or public)
    const hasAccess = await this.checkNoteAccess(userId, noteId);
    if (!hasAccess) {
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

    const updatedNote = await this.prisma.$transaction(async (prisma) => {
        if (dto.folder_id && dto.folder_id !== folderNoteLink.folderId) {
          const newFolder = await prisma.folder.findFirst({
            where: {
              id: dto.folder_id,
              userId,
              deletedAt: null,
            },
          });

          if (!newFolder) {
            throw new NotFoundException('New folder not found');
          }

          // Check for duplicate in new folder
          const currentLink = await prisma.folderLectureNote.findFirst({
             where: { noteId }
          });

          if (dto.title || currentLink?.folderId) {
             const targetTitle = dto.title || folderNoteLink.note.title;
             const duplicate = await prisma.folderLectureNote.findFirst({
               where: {
                 folderId: dto.folder_id,
                 note: { title: targetTitle, deletedAt: null },
                 noteId: { not: noteId } // Exclude self
               }
             });
             if (duplicate) {
               throw new ConflictException(`Note with title "${targetTitle}" already exists in destination folder`);
             }
          }

          await prisma.folderLectureNote.delete({
            where: {
              folderId_noteId: {
                folderId: folderNoteLink.folderId,
                noteId,
              },
            },
          });

          await prisma.folderLectureNote.create({
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

        return await prisma.lectureNote.update({
          where: { id: noteId },
          data: updateData,
        });
    });

    this.logger.debug(`[updateNote] Updated note: ${noteId}`);

    const currentLinkUpdated = await this.prisma.folderLectureNote.findFirst({
      where: { noteId },
    });

    // Update .note file and rename folder if title or folder changed
    if (dto.title || dto.folder_id) {
      let oldNoteBasePath = '';
      let newNoteBasePath = '';
      try {
        const targetFolderId = currentLinkUpdated?.folderId || dto.folder_id;
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

          // If folder changed, we need the old folder path to move from
          let oldFolderStoragePath = folderStoragePath;
          if (dto.folder_id && dto.folder_id !== folderNoteLink.folderId) {
             oldFolderStoragePath = await this.foldersService.buildFolderStoragePath(
               userId,
               folderNoteLink.folderId
             );
          }

          oldNoteBasePath = `${oldFolderStoragePath}/${sanitizedOldTitle}`;
          newNoteBasePath = `${folderStoragePath}/${sanitizedNewTitle}`;

          // Rename/Move folder in MinIO
          if (oldNoteBasePath !== newNoteBasePath) {
            this.logger.debug(`[updateNote] Moving note folder: ${oldNoteBasePath} -> ${newNoteBasePath}`);
            await this.storageService.renameFolder(oldNoteBasePath, newNoteBasePath);
            this.logger.log(`[updateNote] ✅ Moved/Renamed note folder in storage`);
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
        this.logger.error(`[updateNote] Failed to update note in storage. Rolling back DB changes...`, error);
        
        // Rollback DB changes manually (Compensation Transaction)
        try {
           // Revert title and folder link
           await this.prisma.$transaction(async (tx) => {
              await tx.lectureNote.update({
                 where: { id: noteId },
                 data: { title: folderNoteLink.note.title }
              });
              
              if (dto.folder_id && dto.folder_id !== folderNoteLink.folderId) {
                 // Move back to old folder
                 await tx.folderLectureNote.delete({
                    where: { folderId_noteId: { folderId: dto.folder_id, noteId } }
                 });
                 await tx.folderLectureNote.create({
                    data: { folderId: folderNoteLink.folderId, noteId }
                 });
              }
           });
           this.logger.warn(`[updateNote] 🔄 DB changes rolled back successfully`);
           
           // If storage move partially succeeded (e.g. moved but failed to update metadata), try to move back
           // This is complex and risky, so we might just leave it or try best effort
           if (newNoteBasePath && oldNoteBasePath && newNoteBasePath !== oldNoteBasePath) {
              // Check if new path exists, if so move back
              // await this.storageService.renameFolder(newNoteBasePath, oldNoteBasePath);
           }
        } catch (rollbackError) {
           this.logger.error(`[updateNote] 🚨 CRITICAL: Failed to rollback DB changes! Data inconsistency!`, rollbackError);
        }
        
        throw new InternalServerErrorException('Failed to update note storage');
      }
    }

    return {
      id: updatedNote.id,
      title: updatedNote.title,
      folder_id: currentLinkUpdated?.folderId || null,
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
      // Don't fail the request if archiving fails (allow DB soft-delete to proceed)
      this.logger.warn(`[deleteNote] Note ${noteId} soft-deleted in DB, but storage folder move failed (likely file missing).`);
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
   * Create a new file (Version 1)
   */
  async createFile(
    userId: string,
    noteId: string,
    file: Express.Multer.File,
    fileType: string = 'files'
  ) {
    this.logger.debug(`[createFile] userId=${userId} noteId=${noteId} file=${file.originalname}`);

    // Verify note ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: { deletedAt: null },
        folder: { userId, deletedAt: null },
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // Build storage path
    const noteBasePath = await this.getNoteStoragePath(userId, noteId);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `${noteBasePath}/${fileType}/${Date.now()}_v1_${sanitizedFilename}`;

    // Upload to MinIO
    const result = await this.storageService.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimetype,
    );

    // Create File record
    const newFile = await this.prisma.file.create({
      data: {
        noteId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageUrl: result.publicUrl || this.storageService.getPublicUrl(storageKey),
        storageKey,
        version: 1,
        isLatest: true,
      },
    });

    this.logger.log(`[createFile] ✅ Created file: ${newFile.id} (v1)`);
    return newFile;
  }

  /**
   * Update a file (Create new version)
   */
  async updateFile(
    userId: string,
    noteId: string,
    fileId: string,
    file: Express.Multer.File
  ) {
    this.logger.debug(`[updateFile] userId=${userId} noteId=${noteId} fileId=${fileId}`);

    // Verify ownership and get current file
    const currentFile = await this.prisma.file.findFirst({
      where: { id: fileId, noteId, isLatest: true },
      include: { note: true },
    });

    if (!currentFile) {
      throw new NotFoundException('File not found or not latest version');
    }

    // Build new storage path
    const noteBasePath = await this.getNoteStoragePath(userId, noteId);
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const newVersion = currentFile.version + 1;
    const storageKey = `${noteBasePath}/files/${Date.now()}_v${newVersion}_${sanitizedFilename}`;

    // Upload new version
    const result = await this.storageService.uploadBuffer(
      file.buffer,
      storageKey,
      file.mimetype,
    );

    // Transaction: Mark old as not latest, create new version
    const [_, newFile] = await this.prisma.$transaction([
      this.prisma.file.update({
        where: { id: fileId },
        data: { isLatest: false },
      }),
      this.prisma.file.create({
        data: {
          noteId,
          fileName: file.originalname,
          fileType: file.mimetype,
          fileSize: file.size,
          storageUrl: result.publicUrl || this.storageService.getPublicUrl(storageKey),
          storageKey,
          version: newVersion,
          isLatest: true,
          previousVersionId: currentFile.id,
        },
      }),
    ]);

    this.logger.log(`[updateFile] ✅ Updated file: ${currentFile.id} -> ${newFile.id} (v${newVersion})`);
    return newFile;
  }

  /**
   * Save granular page typing/ink
   */
  async savePageTyping(
    userId: string,
    noteId: string,
    fileId: string,
    pageNumber: number,
    content: any, // Delta
    expectedVersion?: number,
  ) {
    this.logger.debug(`[savePageTyping] userId=${userId} fileId=${fileId} page=${pageNumber} ver=${expectedVersion}`);

    // Verify ownership
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId,
        note: { deletedAt: null },
        folder: { userId, deletedAt: null },
      },
    });

    if (!folderNote) {
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    // If expectedVersion is provided, we must perform optimistic locking check
    if (typeof expectedVersion === 'number') {
      // Try to update existing record
      try {
        const pageContent = await this.prisma.notePageContent.update({
          where: {
            fileId_pageNumber: {
              fileId,
              pageNumber,
            },
            version: expectedVersion, // Optimistic lock condition
          },
          data: {
            content: content as Prisma.InputJsonValue,
            version: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        this.logger.log(`[savePageTyping] ✅ Updated page content with lock: ${pageContent.id} (v${pageContent.version})`);
        return pageContent;
      } catch (error) {
        // Update failed, check why
        // It could be record not found OR version mismatch
        const existing = await this.prisma.notePageContent.findUnique({
          where: {
            fileId_pageNumber: {
              fileId,
              pageNumber,
            },
          },
        });

        if (existing) {
          // Record exists but version didn't match
          this.logger.warn(`[savePageTyping] ❌ Version conflict: DB=${existing.version}, Expected=${expectedVersion}`);
          throw new ConflictException({
            message: 'Version conflict',
            currentVersion: existing.version,
            yourVersion: expectedVersion,
          });
        }

        // Record doesn't exist, create it (if expectedVersion was 0 or null, but here it is number)
        if (expectedVersion !== 0) {
           // If client expected a version > 0 but it doesn't exist, that's weird but maybe treat as create?
           // Or maybe strict check? Let's assume create is allowed.
        }
      }
    }

    // Fallback to upsert (no locking or creation)
    const pageContent = await this.prisma.notePageContent.upsert({
      where: {
        fileId_pageNumber: {
          fileId,
          pageNumber,
        },
      },
      update: {
        content: content as Prisma.InputJsonValue,
        version: { increment: 1 },
        updatedAt: new Date(),
      },
      create: {
        noteId,
        fileId,
        pageNumber,
        content: content as Prisma.InputJsonValue,
        version: 1,
      },
    });

    this.logger.log(`[savePageTyping] ✅ Saved page content: ${pageContent.id} (v${pageContent.version})`);
    return pageContent;
  }

  /**
   * Get granular page typing
   */
  async getPageTyping(
    userId: string,
    noteId: string,
    fileId: string,
    pageNumber: number
  ) {
    this.logger.debug(`[getPageTyping] userId=${userId} fileId=${fileId} page=${pageNumber}`);

    const pageContent = await this.prisma.notePageContent.findUnique({
      where: {
        fileId_pageNumber: {
          fileId,
          pageNumber,
        },
      },
    });

    if (!pageContent) {
      return { content: [], version: 0 };
    }

    return pageContent;
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

    // Verify access (owner, collaborator, or public)
    const hasAccess = await this.checkNoteAccess(userId, noteId);
    if (!hasAccess) {
      this.logger.warn(`[getNoteContent] ❌ Note not found or access denied: ${noteId}`);
      throw new NotFoundException(`Note not found: ${noteId}`);
    }

    this.logger.log(`[getNoteContent] ✅ Note access verified`);

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

  // ============================================================================
  // Sharing Methods
  // ============================================================================

  /**
   * Update note public access level
   */
  async updatePublicAccess(
    userId: string,
    noteId: string,
    publicAccess: 'PRIVATE' | 'PUBLIC_READ' | 'PUBLIC_EDIT',
  ) {
    this.logger.debug(`[updatePublicAccess] userId=${userId} noteId=${noteId} access=${publicAccess}`);

    // Verify ownership
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
      throw new NotFoundException('Note not found or access denied');
    }

    // Update public access
    const updatedNote = await this.prisma.lectureNote.update({
      where: { id: noteId },
      data: { publicAccess },
    });

    this.logger.log(`[updatePublicAccess] ✅ Updated public access to ${publicAccess}`);

    return {
      id: updatedNote.id,
      publicAccess: updatedNote.publicAccess,
    };
  }

  /**
   * Get collaborators for a note
   */
  async getCollaborators(userId: string, noteId: string) {
    this.logger.debug(`[getCollaborators] userId=${userId} noteId=${noteId}`);

    // Verify ownership
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
      throw new NotFoundException('Note not found or access denied');
    }

    // Get collaborators
    const collaborators = await this.prisma.noteCollaborator.findMany({
      where: { noteId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    return collaborators.map((c: any) => ({
      id: c.id,
      noteId: c.noteId,
      userId: c.userId,
      email: c.user.email,
      displayName: c.user.displayName,
      permission: c.permission,
      createdAt: c.createdAt.toISOString(),
    }));
  }

  /**
   * Invite collaborator by email
   */
  async inviteCollaborator(
    userId: string,
    noteId: string,
    email: string,
    permission: 'VIEWER' | 'EDITOR',
  ) {
    this.logger.debug(`[inviteCollaborator] userId=${userId} noteId=${noteId} email=${email}`);

    // Verify ownership
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
      throw new NotFoundException('Note not found or access denied');
    }

    // Find user by email
    const invitedUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found with this email');
    }

    // Check if already a collaborator
    const existing = await this.prisma.noteCollaborator.findFirst({
      where: {
        noteId,
        userId: invitedUser.id,
      },
    });

    if (existing) {
      throw new ConflictException('User is already a collaborator');
    }

    // Create collaborator
    const collaborator = await this.prisma.noteCollaborator.create({
      data: {
        noteId,
        email,
        userId: invitedUser.id,
        permission,
        invitedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    this.logger.log(`[inviteCollaborator] ✅ Added collaborator ${email}`);

    return {
      id: collaborator.id,
      noteId: collaborator.noteId,
      userId: collaborator.userId,
      email: collaborator.email,
      displayName: collaborator.user?.displayName || null,
      permission: collaborator.permission,
      createdAt: collaborator.createdAt.toISOString(),
    };
  }

  /**
   * Update collaborator permission
   */
  async updateCollaboratorPermission(
    userId: string,
    noteId: string,
    collaboratorId: string,
    permission: 'VIEWER' | 'EDITOR',
  ) {
    this.logger.debug(`[updateCollaboratorPermission] collaboratorId=${collaboratorId} permission=${permission}`);

    // Verify ownership
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
      throw new NotFoundException('Note not found or access denied');
    }

    // Update collaborator
    const collaborator = await this.prisma.noteCollaborator.update({
      where: { id: collaboratorId },
      data: { permission },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });

    this.logger.log(`[updateCollaboratorPermission] ✅ Updated permission to ${permission}`);

    return {
      id: collaborator.id,
      noteId: collaborator.noteId,
      userId: collaborator.userId,
      email: collaborator.email,
      displayName: collaborator.user?.displayName || null,
      permission: collaborator.permission,
    };
  }

  /**
   * Remove collaborator
   */
  async removeCollaborator(userId: string, noteId: string, collaboratorId: string) {
    this.logger.debug(`[removeCollaborator] collaboratorId=${collaboratorId}`);

    // Verify ownership
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
      throw new NotFoundException('Note not found or access denied');
    }

    // Delete collaborator
    await this.prisma.noteCollaborator.delete({
      where: { id: collaboratorId },
    });

    this.logger.log(`[removeCollaborator] ✅ Removed collaborator`);

    return { success: true };
  }

  /**
   * Copy a shared note to user's own folder
   * Creates a new note with copied content and files
   */
  async copyNoteToMyFolder(
    userId: string,
    sourceNoteId: string,
    targetFolderId?: string,
    customTitle?: string,
  ) {
    this.logger.log(`[copyNoteToMyFolder] userId=${userId} sourceNoteId=${sourceNoteId} targetFolderId=${targetFolderId || 'default'} customTitle=${customTitle || 'auto'}`);

    // Verify user has access to source note (shared or public)
    const hasAccess = await this.checkNoteAccess(userId, sourceNoteId);
    if (!hasAccess) {
      throw new NotFoundException('Note not found or access denied');
    }

    // Get source note
    const sourceNoteLink = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: sourceNoteId,
        note: { deletedAt: null },
      },
      include: {
        note: true,
      },
    });

    if (!sourceNoteLink) {
      throw new NotFoundException('Source note not found');
    }

    const sourceNote = sourceNoteLink.note;

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Determine target folder
    let folderId = targetFolderId;
    if (!folderId) {
      // Use default folder or create one
      const defaultFolder = await this.prisma.folder.findFirst({
        where: {
          userId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (defaultFolder) {
        folderId = defaultFolder.id;
      } else {
        // Create a default folder
        const newFolder = await this.prisma.folder.create({
          data: {
            name: 'My Notes',
            userId,
          },
        });
        folderId = newFolder.id;
      }
    }

    // Verify target folder belongs to user
    const targetFolder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        deletedAt: null,
      },
    });

    if (!targetFolder) {
      throw new NotFoundException('Target folder not found');
    }

    // Create new note with custom or default title
    const noteTitle = customTitle?.trim() || `${sourceNote.title} (복사본)`;
    const newNote = await this.prisma.lectureNote.create({
      data: {
        title: noteTitle,
        type: 'student', // Always create as student note
        publicAccess: 'PRIVATE',
      },
    });

    // Link to target folder
    await this.prisma.folderLectureNote.create({
      data: {
        noteId: newNote.id,
        folderId,
      },
    });

    // Copy note content if exists
    const sourceContent = await this.prisma.noteContent.findUnique({
      where: { noteId: sourceNoteId },
    });

    if (sourceContent) {
      await this.prisma.noteContent.create({
        data: {
          noteId: newNote.id,
          content: sourceContent.content as any,
          version: 1,
        },
      });
    }

    // Copy files and page contents
    const sourceFiles = await this.prisma.file.findMany({
      where: {
        noteId: sourceNoteId,
        deletedAt: null,
      },
    });

    // Map old file IDs to new file IDs for NotePageContent
    const fileIdMap = new Map<string, string>();

    for (const sourceFile of sourceFiles) {
      // Copy file metadata (storage is shared, files are read-only)
      const newFile = await this.prisma.file.create({
        data: {
          noteId: newNote.id,
          fileName: sourceFile.fileName,
          fileType: sourceFile.fileType,
          fileSize: sourceFile.fileSize,
          storageKey: sourceFile.storageKey, // Share storage key
          storageUrl: sourceFile.storageUrl,
        },
      });
      fileIdMap.set(sourceFile.id, newFile.id);
    }

    // Copy page contents (per-page annotations/notes)
    const sourcePageContents = await this.prisma.notePageContent.findMany({
      where: { noteId: sourceNoteId },
    });

    for (const pageContent of sourcePageContents) {
      const newFileId = fileIdMap.get(pageContent.fileId);
      if (newFileId) {
        await this.prisma.notePageContent.create({
          data: {
            noteId: newNote.id,
            fileId: newFileId,
            pageNumber: pageContent.pageNumber,
            content: pageContent.content as any,
            storageKey: pageContent.storageKey,
          },
        });
      }
    }

    // Copy audio recordings and timeline events
    const sourceRecordings = await this.prisma.audioRecording.findMany({
      where: {
        noteId: sourceNoteId,
        isActive: true,
      },
      include: {
        timelineEvents: true,
      },
    });

    for (const sourceRecording of sourceRecordings) {
      // Create new recording (share storage)
      const newRecording = await this.prisma.audioRecording.create({
        data: {
          noteId: newNote.id,
          title: sourceRecording.title,
          fileUrl: sourceRecording.fileUrl,
          storageKey: sourceRecording.storageKey, // Share storage key
          durationSec: sourceRecording.durationSec,
        },
      });

      // Copy timeline events for this recording
      for (const event of sourceRecording.timelineEvents) {
        // Map fileId to new file ID if exists
        const newFileId = event.fileId ? fileIdMap.get(event.fileId) : null;
        await this.prisma.audioTimelineEvent.create({
          data: {
            recordingId: newRecording.id,
            timestamp: event.timestamp,
            fileId: newFileId,
            pageNumber: event.pageNumber,
          },
        });
      }
    }

    this.logger.log(`[copyNoteToMyFolder] ✅ Created copy: ${newNote.id} (files: ${sourceFiles.length}, pageContents: ${sourcePageContents.length}, recordings: ${sourceRecordings.length})`);

    return {
      id: newNote.id,
      title: newNote.title,
      type: newNote.type,
      folder_id: folderId,
      public_access: newNote.publicAccess,
      created_at: newNote.createdAt.toISOString(),
      updated_at: newNote.updatedAt.toISOString(),
    };
  }
}

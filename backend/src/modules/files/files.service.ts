import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { LoggingService } from '../logging/logging.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly loggingService: LoggingService,
  ) {}

  async createFile(
    userId: string,
    dto: CreateFileDto,
    file: Express.Multer.File,
  ) {
    this.logger.debug(`[createFile] userId=${userId} noteId=${dto.noteId} file=${file.originalname}`);

    // Verify note ownership/access via FolderLectureNote
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

    // Upload file to storage
    const { url, key } = await this.storageService.uploadFile(
      file,
      userId,
      dto.noteId,
      'pdf' // Assuming PDF for now, or derive from mimetype
    );

    // Create File record
    const createdFile = await this.prisma.file.create({
      data: {
        noteId: dto.noteId,
        fileName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        storageUrl: url,
        storageKey: key,
        version: 1,
        isLatest: true,
      },
    });

    await this.loggingService.audit({
      userId,
      action: 'file.create',
      resourceId: createdFile.id,
      // @ts-expect-error - Payload type definition might be strict
      payload: { noteId: dto.noteId, fileName: file.originalname, version: 1 }
    });

    return createdFile;
  }

  async getFile(userId: string, fileId: string) {
    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
      include: { note: true },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Verify ownership/access via note
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: file.noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException('File not found (Access Denied)');
    }
    
    return file;
  }

  async updateFile(
    userId: string,
    fileId: string,
    dto: UpdateFileDto,
    newFile?: Express.Multer.File,
  ) {
    this.logger.debug(`[updateFile] userId=${userId} fileId=${fileId}`);

    const existingFile = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!existingFile) {
      throw new NotFoundException('File not found');
    }

    // Verify ownership/access via note
    const folderNote = await this.prisma.folderLectureNote.findFirst({
      where: {
        noteId: existingFile.noteId,
        folder: {
          userId,
          deletedAt: null,
        },
      },
    });

    if (!folderNote) {
      throw new NotFoundException('File not found (Access Denied)');
    }

    // Handle versioning if new file is provided
    if (newFile) {
      this.logger.debug(`[updateFile] New file version uploaded for ${existingFile.fileName}`);

      // 1. Mark old file as not latest
      await this.prisma.file.update({
        where: { id: fileId },
        data: { isLatest: false },
      });

      // 2. Upload new file
      const { url, key } = await this.storageService.uploadFile(
        newFile,
        userId,
        existingFile.noteId,
        'pdf'
      );

      // 3. Create new file record pointing to old one
      const createdFile = await this.prisma.file.create({
        data: {
          noteId: existingFile.noteId,
          fileName: newFile.originalname,
          fileType: newFile.mimetype,
          fileSize: newFile.size,
          storageUrl: url,
          storageKey: key,
          version: existingFile.version + 1,
          isLatest: true,
          previousVersionId: existingFile.id,
        },
      });

      await this.loggingService.audit({
        userId,
        action: 'file.update_version',
        resourceId: createdFile.id,
        extra: { previousVersionId: existingFile.id, newVersion: existingFile.version + 1 }
      });

      return createdFile;
    }

    // Just update metadata
    const updatedFile = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        ...dto,
      },
    });

    await this.loggingService.audit({
      userId,
      action: 'file.update_metadata',
      resourceId: updatedFile.id,
      extra: { changes: dto }
    });

    return updatedFile;
  }

  async deleteFile(userId: string, fileId: string) {
    this.logger.debug(`[deleteFile] userId=${userId} fileId=${fileId}`);

    const file = await this.prisma.file.findUnique({
      where: { id: fileId },
    });

    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Soft delete in DB
    await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });

    await this.loggingService.audit({
      userId,
      action: 'file.delete',
      resourceId: fileId,
      extra: { noteId: file.noteId }
    });

    // Ideally, we don't delete from MinIO immediately if soft-delete
    // Or if hard delete:
    // await this.storageService.deleteFile(file.storageKey);

    return { message: 'File deleted successfully' };
  }

  async getFilesForNote(userId: string, noteId: string) {
    return this.prisma.file.findMany({
      where: {
        noteId,
        deletedAt: null,
        isLatest: true, // Only show latest versions by default
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}


/**
 * TypingService Unit Tests
 * Testing page content management business logic
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { TypingService } from './typing.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';
import { LoggingService } from '../logging/logging.service';

describe('TypingService', () => {
  let service: TypingService;

  // Mock data
  const mockUserId = 'user-123';
  const mockNoteId = 'note-123';
  const mockFileId = 'file-123';
  const mockPageNumber = 1;

  const mockPageContent = {
    id: 'content-1',
    noteId: mockNoteId,
    fileId: mockFileId,
    pageNumber: mockPageNumber,
    content: { ops: [{ insert: 'Hello' }] },
    storageKey: 'users/test@example.com/Note/typing/file-123_1.json',
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFile = {
    id: mockFileId,
    noteId: mockNoteId,
    fileName: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
  };

  // Mock services
  const mockPrismaService = {
    notePageContent: {
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
    },
    file: {
      findUnique: jest.fn() as jest.Mock,
    },
  };

  const mockStorageService = {
    getFileStream: jest.fn() as jest.Mock,
    uploadBuffer: jest.fn() as jest.Mock,
    deleteFile: jest.fn() as jest.Mock,
  };

  const mockNotesService = {
    getNoteStoragePath: jest.fn() as jest.Mock,
  };

  const mockLoggingService = {
    audit: jest.fn() as jest.Mock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotesService, useValue: mockNotesService },
        { provide: LoggingService, useValue: mockLoggingService },
      ],
    }).compile();

    service = module.get<TypingService>(TypingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPageContent', () => {
    it('should return null when content not found', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);

      const result = await service.getPageContent(mockUserId, mockNoteId, mockFileId, mockPageNumber);

      expect(result).toBeNull();
    });

    it('should return content from MinIO when storageKey exists', async () => {
      const minioContent = { ops: [{ insert: 'Hello from MinIO' }] };
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(mockPageContent);
      mockStorageService.getFileStream.mockResolvedValue({
        body: Buffer.from(JSON.stringify(minioContent)),
      });

      const result = await service.getPageContent(mockUserId, mockNoteId, mockFileId, mockPageNumber);

      expect(result).toBeDefined();
      expect(result?.content).toEqual(minioContent);
      expect(mockStorageService.getFileStream).toHaveBeenCalledWith(mockPageContent.storageKey);
    });

    it('should fallback to DB content when MinIO fails', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(mockPageContent);
      mockStorageService.getFileStream.mockRejectedValue(new Error('MinIO error'));

      const result = await service.getPageContent(mockUserId, mockNoteId, mockFileId, mockPageNumber);

      expect(result).toEqual(mockPageContent);
    });

    it('should handle S3 SDK stream response', async () => {
      const minioContent = { ops: [{ insert: 'S3 content' }] };
      const uint8Array = new Uint8Array(Buffer.from(JSON.stringify(minioContent)));
      
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(mockPageContent);
      mockStorageService.getFileStream.mockResolvedValue({
        body: {
          transformToByteArray: jest.fn().mockResolvedValue(uint8Array),
        },
      });

      const result = await service.getPageContent(mockUserId, mockNoteId, mockFileId, mockPageNumber);

      expect(result?.content).toEqual(minioContent);
    });
  });

  describe('savePageContent', () => {
    const saveDto = {
      fileId: mockFileId,
      pageNumber: mockPageNumber,
      content: { ops: [{ insert: 'New content' }] },
    };

    beforeEach(() => {
      mockNotesService.getNoteStoragePath.mockResolvedValue('users/test@example.com/Note');
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
    });

    it('should create new page content', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.notePageContent.create.mockResolvedValue({
        ...mockPageContent,
        content: {},
        version: 1,
      });

      const result = await service.savePageContent(mockUserId, mockNoteId, saveDto);

      expect(result.version).toBe(1);
      expect(mockPrismaService.notePageContent.create).toHaveBeenCalled();
      expect(mockStorageService.uploadBuffer).toHaveBeenCalled();
      expect(mockLoggingService.audit).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'typing.create',
        }),
      );
    });

    it('should update existing page content', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(mockPageContent);
      mockPrismaService.notePageContent.update.mockResolvedValue({
        ...mockPageContent,
        version: 2,
      });

      const result = await service.savePageContent(mockUserId, mockNoteId, saveDto);

      expect(result.version).toBe(2);
      expect(mockPrismaService.notePageContent.update).toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue({
        ...mockPageContent,
        version: 5,
      });

      await expect(
        service.savePageContent(mockUserId, mockNoteId, { ...saveDto, expectedVersion: 3 }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when file not found', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(service.savePageContent(mockUserId, mockNoteId, saveDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when file belongs to different note', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findUnique.mockResolvedValue({ ...mockFile, noteId: 'different-note' });

      await expect(service.savePageContent(mockUserId, mockNoteId, saveDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw InternalServerErrorException when MinIO upload fails', async () => {
      mockStorageService.uploadBuffer.mockRejectedValue(new Error('MinIO error'));

      await expect(service.savePageContent(mockUserId, mockNoteId, saveDto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should rollback MinIO upload when DB update fails', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.notePageContent.create.mockRejectedValue(new Error('DB error'));
      mockStorageService.deleteFile.mockResolvedValue(undefined);

      await expect(service.savePageContent(mockUserId, mockNoteId, saveDto)).rejects.toThrow();

      expect(mockStorageService.deleteFile).toHaveBeenCalled();
    });

    it('should handle optimistic locking with correct version', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(mockPageContent);
      mockPrismaService.notePageContent.update.mockResolvedValue({
        ...mockPageContent,
        version: 2,
      });

      const result = await service.savePageContent(mockUserId, mockNoteId, { ...saveDto, expectedVersion: 1 });

      expect(result.version).toBe(2);
    });
  });
});

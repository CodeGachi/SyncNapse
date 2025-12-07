import { Test, TestingModule } from '@nestjs/testing';
import { FilesService } from './files.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';
import { LoggingService } from '../logging/logging.service';

describe('FilesService', () => {
  let service: FilesService;

  const mockPrismaService = {
    folderLectureNote: {
      findFirst: jest.fn(),
    },
    lectureNote: {
      findUnique: jest.fn(),
    },
    file: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockFile = {
    id: 'file-123',
    noteId: 'note-123',
    fileName: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    storageUrl: 'http://minio/bucket/key',
    storageKey: 'key',
    version: 1,
    isLatest: true,
    uploadedAt: new Date(),
  };

  const mockMulterFile = {
    originalname: 'test.pdf',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test'),
  } as Express.Multer.File;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: LoggingService, useValue: { audit: jest.fn() } }, // Mock LoggingService
      ],
    }).compile();

    service = module.get<FilesService>(FilesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFile', () => {
    it('should create a file successfully', async () => {
      // Arrange
      const userId = 'user-1';
      const dto = { noteId: 'note-123' };
      
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });
      mockPrismaService.lectureNote.findUnique.mockResolvedValue({ id: 'note-123' });
      mockStorageService.uploadFile.mockResolvedValue({ url: 'url', key: 'key' });
      mockPrismaService.file.create.mockResolvedValue(mockFile);

      // Act
      const result = await service.createFile(userId, dto, mockMulterFile);

      // Assert
      expect(result).toEqual(mockFile);
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
      expect(mockPrismaService.file.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      
      // Make sure create is NOT called
      mockPrismaService.file.create.mockClear();

      await expect(
        service.createFile('user-1', { noteId: 'note-123' }, mockMulterFile),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFile', () => {
    it('should return file if found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });

      const result = await service.getFile('user-1', 'file-123');

      expect(result).toEqual(mockFile);
    });

    it('should throw NotFoundException if file not found', async () => {
      mockPrismaService.file.findUnique.mockResolvedValue(null);

      await expect(
        service.getFile('user-1', 'file-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFile', () => {
    it('should create new version when new file uploaded', async () => {
      // Arrange
      mockPrismaService.file.findUnique.mockResolvedValue(mockFile);
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });
      mockStorageService.uploadFile.mockResolvedValue({ url: 'url_v2', key: 'key_v2' });
      mockPrismaService.file.create.mockResolvedValue({ ...mockFile, version: 2 });

      // Act
      const result = await service.updateFile('user-1', 'file-123', {}, mockMulterFile);

      // Assert
      expect(mockPrismaService.file.update).toHaveBeenCalledWith({
        where: { id: 'file-123' },
        data: { isLatest: false },
      });
      
      // Corrected assertion
      expect(mockPrismaService.file.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          version: 2,
          previousVersionId: 'file-123',
        }),
      });
    });
  });
});

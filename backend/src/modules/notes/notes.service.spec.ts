import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FoldersService } from '../folders/folders.service';

describe('NotesService', () => {
  let service: NotesService;
  let prismaService: any;

  const mockPrismaService = {
    folderLectureNote: {
      findFirst: jest.fn(),
    },
    notePageContent: {
      update: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadBuffer: jest.fn(),
  };

  const mockFoldersService = {
    buildFolderStoragePath: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: FoldersService, useValue: mockFoldersService },
      ],
    }).compile();

    service = module.get<NotesService>(NotesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('savePageTyping', () => {
    const userId = 'user-1';
    const noteId = 'note-1';
    const fileId = 'file-1';
    const pageNumber = 1;
    const content = { delta: 'test' };

    it('should save content using upsert when no version provided', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'link-1' });
      mockPrismaService.notePageContent.upsert.mockResolvedValue({ id: 'content-1', version: 1 });

      const result = await service.savePageTyping(userId, noteId, fileId, pageNumber, content);

      expect(result.version).toBe(1);
      expect(mockPrismaService.notePageContent.upsert).toHaveBeenCalled();
      expect(mockPrismaService.notePageContent.update).not.toHaveBeenCalled();
    });

    it('should update content when version matches (optimistic locking)', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'link-1' });
      mockPrismaService.notePageContent.update.mockResolvedValue({ id: 'content-1', version: 2 });

      const result = await service.savePageTyping(userId, noteId, fileId, pageNumber, content, 1);

      expect(result.version).toBe(2);
      expect(mockPrismaService.notePageContent.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ version: 1 }),
        })
      );
    });

    it('should throw ConflictException when version mismatch', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'link-1' });
      // Update fails
      mockPrismaService.notePageContent.update.mockRejectedValue(new Error('Record to update not found'));
      // Found existing record with different version
      mockPrismaService.notePageContent.findUnique.mockResolvedValue({ id: 'content-1', version: 3 });

      await expect(service.savePageTyping(userId, noteId, fileId, pageNumber, content, 1))
        .rejects
        .toThrow(ConflictException);
      
      expect(mockPrismaService.notePageContent.findUnique).toHaveBeenCalled();
    });
  });
});


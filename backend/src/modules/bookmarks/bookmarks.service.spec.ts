import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksService } from './bookmarks.service';
import { PrismaService } from '../db/prisma.service';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('BookmarksService', () => {
  let service: BookmarksService;
  let mockPrisma: {
    bookmark: {
      findMany: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    // Create mock Prisma service
    mockPrisma = {
      bookmark: {
        findMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarksService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<BookmarksService>(BookmarksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllForNote', () => {
    it('should return all bookmarks for a note and user', async () => {
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          noteId: 'note-1',
          userId: 'user-1',
          startSec: new Prisma.Decimal(10.5),
          tag: 'important',
          comment: 'Review this',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bookmark-2',
          noteId: 'note-1',
          userId: 'user-1',
          startSec: new Prisma.Decimal(25.75),
          tag: null,
          comment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrisma.bookmark.findMany.mockResolvedValue(mockBookmarks);

      const result = await service.findAllForNote('note-1', 'user-1');

      expect(result).toHaveLength(2);
      expect(result[0].startSec).toBe(10.5);
      expect(result[1].startSec).toBe(25.75);
      expect(mockPrisma.bookmark.findMany).toHaveBeenCalledWith({
        where: { noteId: 'note-1', userId: 'user-1' },
        orderBy: { startSec: 'asc' },
      });
    });

    it('should return empty array when no bookmarks exist', async () => {
      mockPrisma.bookmark.findMany.mockResolvedValue([]);

      const result = await service.findAllForNote('note-1', 'user-1');

      expect(result).toEqual([]);
    });
  });

  describe('createForNote', () => {
    it('should create a bookmark successfully', async () => {
      const dto = {
        startSec: 15.5,
        tag: 'key-point',
        comment: 'Important section',
      };

      const mockCreated = {
        id: 'bookmark-new',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(15.5),
        tag: 'key-point',
        comment: 'Important section',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.create.mockResolvedValue(mockCreated);

      const result = await service.createForNote('note-1', 'user-1', dto);

      expect(result.id).toBe('bookmark-new');
      expect(result.startSec).toBe(15.5);
      expect(result.tag).toBe('key-point');
      expect(mockPrisma.bookmark.create).toHaveBeenCalledWith({
        data: {
          noteId: 'note-1',
          userId: 'user-1',
          startSec: expect.any(Prisma.Decimal),
          tag: 'key-point',
          comment: 'Important section',
        },
      });
    });

    it('should throw BadRequestException for negative startSec', async () => {
      const dto = {
        startSec: -5,
      };

      await expect(service.createForNote('note-1', 'user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.bookmark.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const dto = {
        startSec: 10.5,
      };

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      mockPrisma.bookmark.create.mockRejectedValue(prismaError);

      await expect(service.createForNote('note-1', 'user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create bookmark without optional fields', async () => {
      const dto = {
        startSec: 20.0,
      };

      const mockCreated = {
        id: 'bookmark-minimal',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(20.0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.create.mockResolvedValue(mockCreated);

      const result = await service.createForNote('note-1', 'user-1', dto);

      expect(result.tag).toBeNull();
      expect(result.comment).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a bookmark by ID', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(30.25),
        tag: 'review',
        comment: 'Check this',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockBookmark);

      const result = await service.findOne('bookmark-1', 'user-1');

      expect(result.id).toBe('bookmark-1');
      expect(result.startSec).toBe(30.25);
      expect(mockPrisma.bookmark.findFirst).toHaveBeenCalledWith({
        where: { id: 'bookmark-1', userId: 'user-1' },
      });
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);

      await expect(service.findOne('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when bookmark belongs to another user', async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);

      await expect(service.findOne('bookmark-1', 'different-user')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a bookmark successfully', async () => {
      const dto = {
        tag: 'updated-tag',
        comment: 'Updated comment',
      };

      const mockExisting = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(10.0),
        tag: 'old-tag',
        comment: 'Old comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        tag: 'updated-tag',
        comment: 'Updated comment',
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.bookmark.update.mockResolvedValue(mockUpdated);

      const result = await service.update('bookmark-1', 'user-1', dto);

      expect(result.tag).toBe('updated-tag');
      expect(result.comment).toBe('Updated comment');
      expect(mockPrisma.bookmark.update).toHaveBeenCalled();
    });

    it('should update startSec', async () => {
      const dto = {
        startSec: 50.5,
      };

      const mockExisting = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(10.0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockUpdated = {
        ...mockExisting,
        startSec: new Prisma.Decimal(50.5),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.bookmark.update.mockResolvedValue(mockUpdated);

      const result = await service.update('bookmark-1', 'user-1', dto);

      expect(result.startSec).toBe(50.5);
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);

      await expect(service.update('non-existent', 'user-1', {})).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.bookmark.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for negative startSec', async () => {
      const dto = {
        startSec: -10,
      };

      const mockExisting = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(10.0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockExisting);

      await expect(service.update('bookmark-1', 'user-1', dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.bookmark.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on unique constraint violation', async () => {
      const dto = {
        startSec: 20.0,
      };

      const mockExisting = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(10.0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockExisting);

      const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
      });

      mockPrisma.bookmark.update.mockRejectedValue(prismaError);

      await expect(service.update('bookmark-1', 'user-1', dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a bookmark successfully', async () => {
      const mockExisting = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(10.0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockExisting);
      mockPrisma.bookmark.delete.mockResolvedValue(mockExisting);

      await service.remove('bookmark-1', 'user-1');

      expect(mockPrisma.bookmark.delete).toHaveBeenCalledWith({
        where: { id: 'bookmark-1' },
      });
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);

      await expect(service.remove('non-existent', 'user-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.bookmark.delete).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to delete another users bookmark', async () => {
      mockPrisma.bookmark.findFirst.mockResolvedValue(null);

      await expect(service.remove('bookmark-1', 'different-user')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.bookmark.delete).not.toHaveBeenCalled();
    });
  });

  describe('Decimal conversion', () => {
    it('should convert Decimal to number correctly', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal('123.45'),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.findFirst.mockResolvedValue(mockBookmark);

      const result = await service.findOne('bookmark-1', 'user-1');

      expect(typeof result.startSec).toBe('number');
      expect(result.startSec).toBe(123.45);
    });

    it('should handle zero startSec', async () => {
      const dto = {
        startSec: 0,
      };

      const mockCreated = {
        id: 'bookmark-zero',
        noteId: 'note-1',
        userId: 'user-1',
        startSec: new Prisma.Decimal(0),
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bookmark.create.mockResolvedValue(mockCreated);

      const result = await service.createForNote('note-1', 'user-1', dto);

      expect(result.startSec).toBe(0);
    });
  });
});


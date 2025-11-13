import { Test, TestingModule } from '@nestjs/testing';
import { BookmarksController } from './bookmarks.controller';
import { BookmarksService } from './bookmarks.service';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto';

describe('BookmarksController', () => {
  let controller: BookmarksController;
  let mockBookmarksService: {
    findAllForNote: jest.Mock;
    createForNote: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };
  let mockHalService: {
    resource: jest.Mock;
    collection: jest.Mock;
  };
  let mockLinkBuilderService: {
    self: jest.Mock;
  };

  const mockUser = { id: 'user-123' };

  beforeEach(async () => {
    mockBookmarksService = {
      findAllForNote: jest.fn(),
      createForNote: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    mockHalService = {
      resource: jest.fn(),
      collection: jest.fn(),
    };

    mockLinkBuilderService = {
      self: jest.fn((href) => ({ href })),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BookmarksController],
      providers: [
        {
          provide: BookmarksService,
          useValue: mockBookmarksService,
        },
        {
          provide: HalService,
          useValue: mockHalService,
        },
        {
          provide: LinkBuilderService,
          useValue: mockLinkBuilderService,
        },
      ],
    }).compile();

    controller = module.get<BookmarksController>(BookmarksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllForNote', () => {
    it('should return HAL collection of bookmarks', async () => {
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          noteId: 'note-1',
          userId: 'user-123',
          startSec: 10.5,
          tag: 'important',
          comment: 'Review this',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'bookmark-2',
          noteId: 'note-1',
          userId: 'user-123',
          startSec: 25.75,
          tag: null,
          comment: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockCollection = {
        count: 2,
        items: mockBookmarks,
        _links: {
          self: { href: '/api/notes/note-1/bookmarks' },
          note: { href: '/api/notes/note-1' },
        },
      };

      mockBookmarksService.findAllForNote.mockResolvedValue(mockBookmarks);
      mockHalService.collection.mockReturnValue(mockCollection);

      const result = await controller.findAllForNote('note-1', mockUser);

      expect(mockBookmarksService.findAllForNote).toHaveBeenCalledWith('note-1', 'user-123');
      expect(mockHalService.collection).toHaveBeenCalledWith(mockBookmarks, {
        selfHref: '/api/notes/note-1/bookmarks',
        itemSelfHref: expect.any(Function),
        extraLinks: {
          note: { href: '/api/notes/note-1' },
        },
      });
      expect(result).toEqual(mockCollection);
    });

    it('should handle empty bookmark list', async () => {
      mockBookmarksService.findAllForNote.mockResolvedValue([]);
      mockHalService.collection.mockReturnValue({
        count: 0,
        items: [],
        _links: { self: { href: '/api/notes/note-1/bookmarks' } },
      });

      const result = await controller.findAllForNote('note-1', mockUser);

      expect(result.count).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('createForNote', () => {
    it('should create a bookmark and return HAL resource', async () => {
      const dto: CreateBookmarkDto = {
        startSec: 15.5,
        tag: 'key-point',
        comment: 'Important section',
      };

      const mockCreated = {
        id: 'bookmark-new',
        noteId: 'note-1',
        userId: 'user-123',
        startSec: 15.5,
        tag: 'key-point',
        comment: 'Important section',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResource = {
        ...mockCreated,
        _links: {
          self: { href: '/api/bookmarks/bookmark-new' },
          note: { href: '/api/notes/note-1' },
          user: { href: '/api/users/user-123' },
          collection: { href: '/api/notes/note-1/bookmarks' },
        },
      };

      mockBookmarksService.createForNote.mockResolvedValue(mockCreated);
      mockHalService.resource.mockReturnValue(mockResource);

      const result = await controller.createForNote('note-1', dto, mockUser);

      expect(mockBookmarksService.createForNote).toHaveBeenCalledWith('note-1', 'user-123', dto);
      expect(mockHalService.resource).toHaveBeenCalled();
      expect(result).toEqual(mockResource);
    });

    it('should create bookmark without optional fields', async () => {
      const dto: CreateBookmarkDto = {
        startSec: 20.0,
      };

      const mockCreated = {
        id: 'bookmark-minimal',
        noteId: 'note-1',
        userId: 'user-123',
        startSec: 20.0,
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookmarksService.createForNote.mockResolvedValue(mockCreated);
      mockHalService.resource.mockReturnValue({ ...mockCreated, _links: {} });

      const result = await controller.createForNote('note-1', dto, mockUser);

      expect(mockBookmarksService.createForNote).toHaveBeenCalledWith('note-1', 'user-123', dto);
      expect(result.tag).toBeNull();
      expect(result.comment).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return a bookmark as HAL resource', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-123',
        startSec: 30.25,
        tag: 'review',
        comment: 'Check this',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResource = {
        ...mockBookmark,
        _links: {
          self: { href: '/api/bookmarks/bookmark-1' },
          note: { href: '/api/notes/note-1' },
          user: { href: '/api/users/user-123' },
          collection: { href: '/api/notes/note-1/bookmarks' },
        },
      };

      mockBookmarksService.findOne.mockResolvedValue(mockBookmark);
      mockHalService.resource.mockReturnValue(mockResource);

      const result = await controller.findOne('bookmark-1', mockUser);

      expect(mockBookmarksService.findOne).toHaveBeenCalledWith('bookmark-1', 'user-123');
      expect(mockHalService.resource).toHaveBeenCalled();
      expect(result).toEqual(mockResource);
    });
  });

  describe('update', () => {
    it('should update a bookmark and return HAL resource', async () => {
      const dto: UpdateBookmarkDto = {
        tag: 'updated-tag',
        comment: 'Updated comment',
      };

      const mockUpdated = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-123',
        startSec: 10.0,
        tag: 'updated-tag',
        comment: 'Updated comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockResource = {
        ...mockUpdated,
        _links: {
          self: { href: '/api/bookmarks/bookmark-1' },
          note: { href: '/api/notes/note-1' },
          user: { href: '/api/users/user-123' },
          collection: { href: '/api/notes/note-1/bookmarks' },
        },
      };

      mockBookmarksService.update.mockResolvedValue(mockUpdated);
      mockHalService.resource.mockReturnValue(mockResource);

      const result = await controller.update('bookmark-1', dto, mockUser);

      expect(mockBookmarksService.update).toHaveBeenCalledWith('bookmark-1', 'user-123', dto);
      expect(mockHalService.resource).toHaveBeenCalled();
      expect(result).toEqual(mockResource);
    });

    it('should update only startSec', async () => {
      const dto: UpdateBookmarkDto = {
        startSec: 50.5,
      };

      const mockUpdated = {
        id: 'bookmark-1',
        noteId: 'note-1',
        userId: 'user-123',
        startSec: 50.5,
        tag: 'old-tag',
        comment: 'old comment',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookmarksService.update.mockResolvedValue(mockUpdated);
      mockHalService.resource.mockReturnValue({ ...mockUpdated, _links: {} });

      const result = await controller.update('bookmark-1', dto, mockUser);

      expect(mockBookmarksService.update).toHaveBeenCalledWith('bookmark-1', 'user-123', dto);
      expect(result.startSec).toBe(50.5);
    });
  });

  describe('remove', () => {
    it('should delete a bookmark', async () => {
      mockBookmarksService.remove.mockResolvedValue(undefined);

      await controller.remove('bookmark-1', mockUser);

      expect(mockBookmarksService.remove).toHaveBeenCalledWith('bookmark-1', 'user-123');
    });

    it('should not return anything on successful deletion', async () => {
      mockBookmarksService.remove.mockResolvedValue(undefined);

      const result = await controller.remove('bookmark-1', mockUser);

      expect(result).toBeUndefined();
    });
  });

  describe('HAL resource building', () => {
    it('should include correct links in HAL resource', async () => {
      const mockBookmark = {
        id: 'bookmark-test',
        noteId: 'note-test',
        userId: 'user-test',
        startSec: 100.0,
        tag: null,
        comment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockBookmarksService.findOne.mockResolvedValue(mockBookmark);
      mockHalService.resource.mockImplementation((data, links) => ({
        ...data,
        _links: links,
      }));

      const result = await controller.findOne('bookmark-test', { id: 'user-test' });

      expect(result._links).toMatchObject({
        self: { href: '/api/bookmarks/bookmark-test' },
        note: { href: '/api/notes/note-test' },
        user: { href: '/api/users/user-test' },
        collection: { href: '/api/notes/note-test/bookmarks' },
      });
    });
  });
});


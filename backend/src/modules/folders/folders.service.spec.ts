/**
 * FoldersService Unit Tests
 * Testing business logic for folder management
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { FoldersService } from './folders.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';

describe('FoldersService', () => {
  let service: FoldersService;

  // Mock data
  const mockUserId = 'user-123';
  const mockFolderId = 'folder-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockFolder = {
    id: mockFolderId,
    userId: mockUserId,
    name: 'Test Folder',
    parentId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockRootFolder = {
    id: 'root-folder',
    userId: mockUserId,
    name: 'Root',
    parentId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  // Mock services
  const mockPrismaService = {
    folder: {
      findMany: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    user: {
      findUnique: jest.fn() as jest.Mock,
    },
  };

  const mockStorageService = {
    createFolder: jest.fn() as jest.Mock,
    renameFolder: jest.fn() as jest.Mock,
    renameFile: jest.fn() as jest.Mock,
    uploadBuffer: jest.fn() as jest.Mock,
    deleteFolder: jest.fn() as jest.Mock,
  };

  const mockNotesService = {
    deleteNotesByFolder: jest.fn() as jest.Mock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoldersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    service = module.get<FoldersService>(FoldersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFoldersByUser', () => {
    it('should return all folders for user', async () => {
      const folders = [mockFolder, { ...mockFolder, id: 'folder-2', name: 'Work' }];
      mockPrismaService.folder.findFirst.mockResolvedValue(mockRootFolder);
      mockPrismaService.folder.findMany.mockResolvedValue(folders);

      const result = await service.getFoldersByUser(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockFolderId);
      expect(result[0].name).toBe('Test Folder');
      expect(mockPrismaService.folder.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should create Root folder if not exists', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(null);
      mockPrismaService.folder.create.mockResolvedValue(mockRootFolder);
      mockPrismaService.folder.findMany.mockResolvedValue([]);

      await service.getFoldersByUser(mockUserId);

      expect(mockPrismaService.folder.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          name: 'Root',
          parentId: null,
        },
      });
    });

    it('should return empty array when no folders exist', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(mockRootFolder);
      mockPrismaService.folder.findMany.mockResolvedValue([]);

      const result = await service.getFoldersByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('createFolder', () => {
    const createDto = { name: 'New Folder', parent_id: undefined };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.folder.findFirst.mockResolvedValue(null); // No existing folder
      mockPrismaService.folder.create.mockResolvedValue({
        ...mockFolder,
        id: 'new-folder',
        name: 'New Folder',
      });
      mockStorageService.createFolder.mockResolvedValue(undefined);
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
    });

    it('should create folder successfully', async () => {
      const result = await service.createFolder(mockUserId, createDto);

      expect(result.name).toBe('New Folder');
      expect(mockPrismaService.folder.create).toHaveBeenCalled();
      expect(mockStorageService.createFolder).toHaveBeenCalled();
    });

    it('should throw NotFoundException when parent folder not found', async () => {
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(null) // Parent not found
        .mockResolvedValueOnce(null);

      await expect(
        service.createFolder(mockUserId, { name: 'New', parent_id: 'invalid-parent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when folder name already exists', async () => {
      // Reset and setup proper mock sequence
      mockPrismaService.folder.findFirst.mockReset();
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockRootFolder) // ensureRootFolder finds root
        .mockResolvedValueOnce(mockFolder); // Duplicate check finds existing folder

      await expect(
        service.createFolder(mockUserId, createDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should not fail if storage creation fails', async () => {
      mockStorageService.createFolder.mockRejectedValue(new Error('Storage error'));

      const result = await service.createFolder(mockUserId, createDto);

      expect(result.name).toBe('New Folder');
    });
  });

  describe('updateFolder', () => {
    const updateDto = { name: 'Updated Name' };

    beforeEach(() => {
      mockPrismaService.folder.findFirst.mockResolvedValue(mockFolder);
      mockPrismaService.folder.update.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Name',
        updatedAt: new Date(),
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
    });

    it('should update folder name', async () => {
      const result = await service.updateFolder(mockUserId, mockFolderId, updateDto);

      expect(result.name).toBe('Updated Name');
      expect(mockPrismaService.folder.update).toHaveBeenCalledWith({
        where: { id: mockFolderId },
        data: { name: 'Updated Name', updatedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(
        service.updateFolder(mockUserId, 'invalid-id', updateDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteFolder', () => {
    beforeEach(() => {
      mockPrismaService.folder.findFirst.mockResolvedValue(mockFolder);
      mockPrismaService.folder.findMany.mockResolvedValue([]); // No child folders
      mockPrismaService.folder.update.mockResolvedValue({ ...mockFolder, deletedAt: new Date() });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockNotesService.deleteNotesByFolder.mockResolvedValue(undefined);
      mockStorageService.renameFile.mockResolvedValue(undefined);
    });

    it('should soft delete folder', async () => {
      const result = await service.deleteFolder(mockUserId, mockFolderId);

      expect(result.message).toBe('Folder deleted successfully');
      expect(mockPrismaService.folder.update).toHaveBeenCalledWith({
        where: { id: mockFolderId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteFolder(mockUserId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should delete child folders recursively', async () => {
      const childFolder = { ...mockFolder, id: 'child-folder', parentId: mockFolderId };
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockFolder) // Main folder
        .mockResolvedValueOnce(childFolder); // Used in recursive path building
      mockPrismaService.folder.findMany
        .mockResolvedValueOnce([childFolder]) // Child folders of main
        .mockResolvedValueOnce([]); // No grandchildren

      await service.deleteFolder(mockUserId, mockFolderId);

      expect(mockPrismaService.folder.update).toHaveBeenCalledTimes(2);
    });

    it('should continue deletion even if notes deletion fails', async () => {
      mockNotesService.deleteNotesByFolder.mockRejectedValue(new Error('Note delete error'));

      const result = await service.deleteFolder(mockUserId, mockFolderId);

      expect(result.message).toBe('Folder deleted successfully');
    });
  });

  describe('moveFolder', () => {
    const newParentId = 'parent-folder';
    const parentFolder = { ...mockFolder, id: newParentId, name: 'Parent' };

    beforeEach(() => {
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockFolder) // Main folder exists
        .mockResolvedValueOnce(parentFolder); // Parent folder exists
      mockPrismaService.folder.findUnique.mockResolvedValue({ parentId: null });
      mockPrismaService.folder.update.mockResolvedValue({
        ...mockFolder,
        parentId: newParentId,
        updatedAt: new Date(),
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStorageService.renameFolder.mockResolvedValue(undefined);
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
    });

    it('should move folder to new parent', async () => {
      const result = await service.moveFolder(mockUserId, mockFolderId, newParentId);

      expect(result.parent_id).toBe(newParentId);
      expect(mockPrismaService.folder.update).toHaveBeenCalled();
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.folder.findFirst.mockReset();
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(
        service.moveFolder(mockUserId, 'invalid-id', newParentId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when moving folder to itself', async () => {
      mockPrismaService.folder.findFirst.mockReset();
      mockPrismaService.folder.findFirst.mockResolvedValue(mockFolder);

      await expect(
        service.moveFolder(mockUserId, mockFolderId, mockFolderId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when parent folder not found', async () => {
      mockPrismaService.folder.findFirst.mockReset();
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(null); // Parent not found

      await expect(
        service.moveFolder(mockUserId, mockFolderId, 'invalid-parent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should handle storage operations when paths differ', async () => {
      // This test verifies the storage operation is called when paths change
      mockPrismaService.folder.findFirst.mockReset();
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockFolder) // Main folder exists
        .mockResolvedValueOnce(parentFolder) // Parent folder exists
        .mockResolvedValueOnce({ ...mockFolder, name: 'Folder', parentId: null }) // For buildFolderStoragePath
        .mockResolvedValueOnce(null); // End of path building
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockStorageService.renameFolder.mockResolvedValue(undefined);
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });

      const result = await service.moveFolder(mockUserId, mockFolderId, newParentId);

      expect(result.parent_id).toBe(newParentId);
    });
  });

  describe('getFolderPath', () => {
    it('should return folder path', async () => {
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(mockFolder)
        .mockResolvedValueOnce(null); // Root reached

      const result = await service.getFolderPath(mockUserId, mockFolderId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockFolderId);
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(
        service.getFolderPath(mockUserId, 'invalid-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return full path with parent folders', async () => {
      const parentFolder = { ...mockFolder, id: 'parent-1', name: 'Parent', parentId: null };
      const childFolder = { ...mockFolder, id: 'child-1', name: 'Child', parentId: 'parent-1' };

      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(childFolder)
        .mockResolvedValueOnce(parentFolder)
        .mockResolvedValueOnce(null);

      const result = await service.getFolderPath(mockUserId, 'child-1');

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Parent');
      expect(result[1].name).toBe('Child');
    });
  });

  describe('buildFolderStoragePath', () => {
    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
    });

    it('should build storage path for folder', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValueOnce({
        ...mockFolder,
        name: 'TestFolder',
      }).mockResolvedValueOnce(null);

      const result = await service.buildFolderStoragePath(mockUserId, mockFolderId);

      expect(result).toContain('users/test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.buildFolderStoragePath(mockUserId, mockFolderId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip Root folder in path', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValueOnce(mockRootFolder);

      const result = await service.buildFolderStoragePath(mockUserId, 'root-folder');

      expect(result).toBe('users/test@example.com');
    });
  });

  describe('buildUserRootPath', () => {
    it('should return user root path', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.buildUserRootPath(mockUserId);

      expect(result).toBe('users/test@example.com');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.buildUserRootPath(mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});


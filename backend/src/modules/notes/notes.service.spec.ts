/**
 * NotesService Unit Tests
 * Testing core note management business logic
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { NotesService } from './notes.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { FoldersService } from '../folders/folders.service';

describe('NotesService', () => {
  let service: NotesService;

  // Mock data
  const mockUserId = 'user-123';
  const mockNoteId = 'note-123';
  const mockFolderId = 'folder-123';
  const mockFileId = 'file-123';

  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    displayName: 'Test User',
  };

  const mockNote = {
    id: mockNoteId,
    title: 'Test Note',
    type: 'student',
    sourceFileUrl: null,
    audioFileUrl: null,
    publicAccess: 'PRIVATE',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockFolder = {
    id: mockFolderId,
    userId: mockUserId,
    name: 'Test Folder',
    parentId: null,
    deletedAt: null,
  };

  const mockFolderNoteLink = {
    folderId: mockFolderId,
    noteId: mockNoteId,
    note: mockNote,
    folder: mockFolder,
  };

  const mockFile = {
    id: mockFileId,
    noteId: mockNoteId,
    fileName: 'test.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    storageUrl: 'http://storage/test.pdf',
    storageKey: 'users/test@example.com/Test Folder/Test Note/files/test.pdf',
    uploadedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  // Mock services
  const mockPrismaService = {
    user: {
      findUnique: jest.fn() as jest.Mock,
    },
    folder: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    lectureNote: {
      findFirst: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    folderLectureNote: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    file: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
      deleteMany: jest.fn() as jest.Mock,
    },
    noteContent: {
      findFirst: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      upsert: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    notePageContent: {
      findUnique: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      upsert: jest.fn() as jest.Mock,
    },
    noteCollaborator: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
      delete: jest.fn() as jest.Mock,
    },
    audioRecording: {
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    audioTimelineEvent: {
      create: jest.fn() as jest.Mock,
    },
    transcriptionSession: {
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    transcriptRevision: {
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    transcriptionSegment: {
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    transcriptionWord: {
      create: jest.fn() as jest.Mock,
    },
    $transaction: jest.fn() as jest.Mock,
  };

  const mockStorageService = {
    uploadBuffer: jest.fn() as jest.Mock,
    getPublicUrl: jest.fn() as jest.Mock,
    getSignedUrl: jest.fn() as jest.Mock,
    getFileStream: jest.fn() as jest.Mock,
    renameFolder: jest.fn() as jest.Mock,
    renameFile: jest.fn() as jest.Mock,
    deleteFile: jest.fn() as jest.Mock,
    deleteFolderRecursively: jest.fn() as jest.Mock,
    listFolders: jest.fn() as jest.Mock,
  };

  const mockFoldersService = {
    buildFolderStoragePath: jest.fn() as jest.Mock,
    buildUserRootPath: jest.fn() as jest.Mock,
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
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkNoteAccess', () => {
    it('should return true for note owner', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);

      const result = await service.checkNoteAccess(mockUserId, mockNoteId);

      expect(result).toBe(true);
    });

    it('should return true for collaborator', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue({ id: 'collab-1' });

      const result = await service.checkNoteAccess(mockUserId, mockNoteId);

      expect(result).toBe(true);
    });

    it('should return true for public note', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({ ...mockNote, publicAccess: 'PUBLIC_READ' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(mockUserId, mockNoteId);

      expect(result).toBe(true);
    });

    it('should return false for no access', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(mockUserId, mockNoteId);

      expect(result).toBe(false);
    });
  });

  describe('getNotesByUser', () => {
    it('should return notes for user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.folderLectureNote.findMany.mockResolvedValue([mockFolderNoteLink]);

      const result = await service.getNotesByUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockNoteId);
      expect(result[0].title).toBe('Test Note');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getNotesByUser(mockUserId)).rejects.toThrow(NotFoundException);
    });

    it('should filter by folder when folderId provided', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.folder.findFirst.mockResolvedValue(mockFolder);
      mockPrismaService.folderLectureNote.findMany.mockResolvedValue([mockFolderNoteLink]);

      const result = await service.getNotesByUser(mockUserId, mockFolderId);

      expect(result).toHaveLength(1);
      expect(mockPrismaService.folderLectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ folderId: mockFolderId }),
        }),
      );
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(service.getNotesByUser(mockUserId, mockFolderId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNote', () => {
    it('should return note for owner', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);

      const result = await service.getNote(mockUserId, mockNoteId);

      expect(result.id).toBe(mockNoteId);
      expect(result.title).toBe('Test Note');
      expect(result.folder_id).toBe(mockFolderId);
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.getNote(mockUserId, mockNoteId)).rejects.toThrow(NotFoundException);
    });

    it('should return note for collaborator without folder_id', async () => {
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce(null) // Not owner
        .mockResolvedValueOnce(mockFolderNoteLink); // Found via any folder
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue({ id: 'collab-1' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getNote(mockUserId, mockNoteId);

      expect(result.id).toBe(mockNoteId);
      expect(result.folder_id).toBeNull(); // Non-owners don't see folder_id
    });
  });

  describe('createNote', () => {
    const createDto = {
      title: 'New Note',
      folder_id: mockFolderId,
      type: 'student' as const,
    };

    beforeEach(() => {
      mockPrismaService.folder.findFirst.mockResolvedValue(mockFolder);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.create.mockResolvedValue({
        ...mockNote,
        id: 'new-note',
        title: 'New Note',
      });
      mockPrismaService.folderLectureNote.create.mockResolvedValue({});
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('users/test@example.com/Test Folder');
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'http://storage/new' });
    });

    it('should create note successfully', async () => {
      const result = await service.createNote(mockUserId, createDto, []);

      expect(result.title).toBe('New Note');
      expect(mockPrismaService.lectureNote.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when folder not found', async () => {
      mockPrismaService.folder.findFirst.mockResolvedValue(null);

      await expect(service.createNote(mockUserId, createDto, [])).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for duplicate title', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);

      await expect(service.createNote(mockUserId, createDto, [])).rejects.toThrow(ConflictException);
    });

    it('should create root folder if not exists', async () => {
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(null) // No root folder
        .mockResolvedValueOnce(mockFolder); // After creation
      mockPrismaService.folder.create.mockResolvedValue(mockFolder);

      const result = await service.createNote(mockUserId, { ...createDto, folder_id: 'root' }, []);

      expect(result.title).toBe('New Note');
      expect(mockPrismaService.folder.create).toHaveBeenCalled();
    });
  });

  describe('updateNote', () => {
    const updateDto = { title: 'Updated Title' };

    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.lectureNote.update.mockResolvedValue({
        ...mockNote,
        title: 'Updated Title',
        updatedAt: new Date(),
      });
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('users/test@example.com/Test Folder');
      mockStorageService.renameFolder.mockResolvedValue(undefined);
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
    });

    it('should update note title', async () => {
      const result = await service.updateNote(mockUserId, mockNoteId, updateDto);

      expect(result.title).toBe('Updated Title');
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.updateNote(mockUserId, mockNoteId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteNote', () => {
    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.lectureNote.update.mockResolvedValue({ ...mockNote, deletedAt: new Date() });
      mockPrismaService.file.findMany.mockResolvedValue([mockFile]);
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('users/test@example.com/Test Folder');
      mockStorageService.renameFolder.mockResolvedValue(undefined);
    });

    it('should soft delete note', async () => {
      const result = await service.deleteNote(mockUserId, mockNoteId);

      expect(result.message).toBe('Note deleted successfully');
      expect(mockPrismaService.lectureNote.update).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.deleteNote(mockUserId, mockNoteId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFilesForNote', () => {
    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.file.findMany.mockResolvedValue([mockFile]);
      mockStorageService.getSignedUrl.mockResolvedValue('http://signed-url');
    });

    it('should return files for note', async () => {
      const result = await service.getFilesForNote(mockUserId, mockNoteId);

      expect(result).toHaveLength(1);
      expect(result[0].fileName).toBe('test.pdf');
      expect(result[0].url).toBe('http://signed-url');
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.getFilesForNote(mockUserId, mockNoteId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveNoteContent', () => {
    const pages = {
      '1': { blocks: [{ id: 'block-1', type: 'text' as const, content: 'Hello' }] },
    };

    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('users/test@example.com/Test Folder');
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
      mockPrismaService.noteContent.upsert.mockResolvedValue({
        id: 'content-1',
        noteId: mockNoteId,
        content: { pages },
        version: 1,
      });
    });

    it('should save note content', async () => {
      const result = await service.saveNoteContent(mockUserId, mockNoteId, pages);

      expect(result.noteId).toBe(mockNoteId);
      expect(mockStorageService.uploadBuffer).toHaveBeenCalled();
      expect(mockPrismaService.noteContent.upsert).toHaveBeenCalled();
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.saveNoteContent(mockUserId, mockNoteId, pages)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getNoteContent', () => {
    const mockNoteContent = {
      id: 'content-1',
      noteId: mockNoteId,
      content: { pages: { '1': { blocks: [] } } },
      version: 1,
      storageKey: 'key',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.noteContent.findUnique.mockResolvedValue(mockNoteContent);
    });

    it('should return note content', async () => {
      const result = await service.getNoteContent(mockUserId, mockNoteId);

      expect(result.noteId).toBe(mockNoteId);
      expect(result.pages).toHaveProperty('1');
    });

    it('should return empty pages when content not found', async () => {
      mockPrismaService.noteContent.findUnique.mockResolvedValue(null);
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('path');
      mockStorageService.getFileStream.mockRejectedValue(new Error('Not found'));

      const result = await service.getNoteContent(mockUserId, mockNoteId);

      expect(result.pages).toEqual({});
    });
  });

  describe('savePageTyping', () => {
    const content = { ops: [{ insert: 'Hello' }] };

    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
    });

    it('should save page content with upsert', async () => {
      mockPrismaService.notePageContent.upsert.mockResolvedValue({
        id: 'page-1',
        fileId: mockFileId,
        pageNumber: 1,
        content,
        version: 1,
      });

      const result = await service.savePageTyping(mockUserId, mockNoteId, mockFileId, 1, content);

      expect(result.version).toBe(1);
      expect(mockPrismaService.notePageContent.upsert).toHaveBeenCalled();
    });

    it('should throw ConflictException on version mismatch', async () => {
      mockPrismaService.notePageContent.update.mockRejectedValue(new Error('P2025'));
      mockPrismaService.notePageContent.findUnique.mockResolvedValue({
        version: 5,
      });

      await expect(
        service.savePageTyping(mockUserId, mockNoteId, mockFileId, 1, content, 3),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(
        service.savePageTyping(mockUserId, mockNoteId, mockFileId, 1, content),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPageTyping', () => {
    it('should return page content', async () => {
      const pageContent = {
        id: 'page-1',
        fileId: mockFileId,
        pageNumber: 1,
        content: { ops: [] },
        version: 2,
      };
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(pageContent);

      const result = await service.getPageTyping(mockUserId, mockNoteId, mockFileId, 1);

      expect(result.version).toBe(2);
    });

    it('should return empty content when not found', async () => {
      mockPrismaService.notePageContent.findUnique.mockResolvedValue(null);

      const result = await service.getPageTyping(mockUserId, mockNoteId, mockFileId, 1);

      expect(result.content).toEqual([]);
      expect(result.version).toBe(0);
    });
  });

  describe('getTrashedNotes', () => {
    it('should return trashed notes', async () => {
      const trashedNote = {
        ...mockFolderNoteLink,
        note: { ...mockNote, deletedAt: new Date() },
      };
      mockPrismaService.folderLectureNote.findMany.mockResolvedValue([trashedNote]);

      const result = await service.getTrashedNotes(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0].deleted_at).toBeDefined();
    });
  });

  describe('restoreNote', () => {
    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({
        ...mockFolderNoteLink,
        note: { ...mockNote, deletedAt: new Date() },
      });
      mockPrismaService.lectureNote.update.mockResolvedValue(mockNote);
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('path');
      mockStorageService.listFolders.mockResolvedValue(['Test Note_123456']);
      mockStorageService.renameFolder.mockResolvedValue(undefined);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.noteContent.findFirst.mockResolvedValue(null);
    });

    it('should restore trashed note', async () => {
      const result = await service.restoreNote(mockUserId, mockNoteId);

      expect(result.id).toBe(mockNoteId);
      expect(mockPrismaService.lectureNote.update).toHaveBeenCalledWith({
        where: { id: mockNoteId },
        data: { deletedAt: null },
      });
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(service.restoreNote(mockUserId, mockNoteId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when note not in trash', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);

      await expect(service.restoreNote(mockUserId, mockNoteId)).rejects.toThrow(ConflictException);
    });
  });

  describe('permanentlyDeleteNote', () => {
    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({
        ...mockFolderNoteLink,
        note: { ...mockNote, deletedAt: new Date() },
      });
      mockFoldersService.buildFolderStoragePath.mockResolvedValue('path');
      mockStorageService.listFolders.mockResolvedValue(['Test Note_123456']);
      mockStorageService.deleteFolderRecursively.mockResolvedValue(undefined);
      mockPrismaService.file.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.noteContent.findFirst.mockResolvedValue(null);
      mockPrismaService.folderLectureNote.delete.mockResolvedValue({});
      mockPrismaService.lectureNote.delete.mockResolvedValue(mockNote);
    });

    it('should permanently delete note', async () => {
      const result = await service.permanentlyDeleteNote(mockUserId, mockNoteId);

      expect(result.message).toBe('Note permanently deleted successfully');
      expect(mockPrismaService.lectureNote.delete).toHaveBeenCalled();
    });

    it('should throw ConflictException when note not in trash', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);

      await expect(service.permanentlyDeleteNote(mockUserId, mockNoteId)).rejects.toThrow(ConflictException);
    });
  });

  describe('updatePublicAccess', () => {
    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.lectureNote.update.mockResolvedValue({
        ...mockNote,
        publicAccess: 'PUBLIC_READ',
      });
    });

    it('should update public access', async () => {
      const result = await service.updatePublicAccess(mockUserId, mockNoteId, 'PUBLIC_READ');

      expect(result.publicAccess).toBe('PUBLIC_READ');
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePublicAccess(mockUserId, mockNoteId, 'PUBLIC_READ'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('inviteCollaborator', () => {
    const invitedUser = { id: 'user-456', email: 'invited@example.com', displayName: 'Invited' };

    beforeEach(() => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(mockFolderNoteLink);
      mockPrismaService.user.findUnique.mockResolvedValue(invitedUser);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.create.mockResolvedValue({
        id: 'collab-1',
        noteId: mockNoteId,
        userId: invitedUser.id,
        email: invitedUser.email,
        permission: 'EDITOR',
        createdAt: new Date(),
        user: invitedUser,
      });
    });

    it('should invite collaborator', async () => {
      const result = await service.inviteCollaborator(mockUserId, mockNoteId, 'invited@example.com', 'EDITOR');

      expect(result.email).toBe('invited@example.com');
      expect(result.permission).toBe('EDITOR');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.inviteCollaborator(mockUserId, mockNoteId, 'notfound@example.com', 'EDITOR'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when already collaborator', async () => {
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(
        service.inviteCollaborator(mockUserId, mockNoteId, 'invited@example.com', 'EDITOR'),
      ).rejects.toThrow(ConflictException);
    });
  });
});


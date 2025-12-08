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
      findMany: jest.fn(),
      create: jest.fn(),
    },
    lectureNote: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    noteCollaborator: {
      findFirst: jest.fn(),
    },
    noteContent: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    notePageContent: {
      update: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    folder: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    file: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    audioRecording: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    audioTimelineEvent: {
      create: jest.fn(),
    },
    transcriptionSession: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    transcriptRevision: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    transcriptionSegment: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    transcriptionWord: {
      create: jest.fn(),
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

  describe('checkNoteAccess', () => {
    const userId = 'user-1';
    const noteId = 'note-1';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return true when user is the owner', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'link-1' });

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(true);
      expect(mockPrismaService.folderLectureNote.findFirst).toHaveBeenCalledWith({
        where: {
          noteId,
          folder: { userId, deletedAt: null },
          note: { deletedAt: null },
        },
      });
    });

    it('should return true when user is a collaborator', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null); // Not owner
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: noteId,
        publicAccess: 'PRIVATE',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue({
        id: 'collab-1',
        noteId,
        userId,
      });

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(true);
      expect(mockPrismaService.noteCollaborator.findFirst).toHaveBeenCalled();
    });

    it('should return true when note has PUBLIC_READ access', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: noteId,
        publicAccess: 'PUBLIC_READ',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(true);
    });

    it('should return true when note has PUBLIC_EDIT access', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: noteId,
        publicAccess: 'PUBLIC_EDIT',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(true);
    });

    it('should return false when note does not exist', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(false);
    });

    it('should return false when user has no access (private note, not owner, not collaborator)', async () => {
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: noteId,
        publicAccess: 'PRIVATE',
      });
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.checkNoteAccess(userId, noteId);

      expect(result).toBe(false);
    });
  });

  describe('copyNoteToMyFolder', () => {
    const userId = 'user-1';
    const sourceNoteId = 'source-note-1';
    const targetFolderId = 'folder-1';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should copy a shared note to user folder successfully', async () => {
      // Mock checkNoteAccess - user has access
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce({ id: 'owner-link' }) // checkNoteAccess - owner check (returns truthy for access)
        .mockResolvedValueOnce({ // Get source note
          noteId: sourceNoteId,
          note: {
            id: sourceNoteId,
            title: 'Original Note',
            type: 'educator',
            publicAccess: 'PUBLIC_READ',
          },
        });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrismaService.folder.findFirst.mockResolvedValue({
        id: targetFolderId,
        name: 'My Folder',
        userId,
      });

      mockPrismaService.lectureNote.create.mockResolvedValue({
        id: 'new-note-1',
        title: 'Original Note (복사본)',
        type: 'student',
        publicAccess: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.folderLectureNote.create.mockResolvedValue({
        noteId: 'new-note-1',
        folderId: targetFolderId,
      });

      mockPrismaService.noteContent.findUnique.mockResolvedValue({
        noteId: sourceNoteId,
        content: { pages: {} },
      });

      mockPrismaService.noteContent.create.mockResolvedValue({
        noteId: 'new-note-1',
        content: { pages: {} },
      });

      mockPrismaService.file.findMany.mockResolvedValue([
        {
          id: 'file-1',
          noteId: sourceNoteId,
          fileName: 'test.pdf',
          fileType: 'application/pdf',
          fileSize: 1000,
          storageKey: 'path/to/file',
          storageUrl: 'http://example.com/file',
        },
      ]);

      mockPrismaService.file.create.mockResolvedValue({
        id: 'new-file-1',
        noteId: 'new-note-1',
        fileName: 'test.pdf',
      });

      mockPrismaService.notePageContent.findMany.mockResolvedValue([]);
      mockPrismaService.audioRecording.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([]);

      const result = await service.copyNoteToMyFolder(userId, sourceNoteId, targetFolderId);

      expect(result).toMatchObject({
        id: 'new-note-1',
        title: 'Original Note (복사본)',
        type: 'student',
        folder_id: targetFolderId,
        public_access: 'PRIVATE',
      });

      expect(mockPrismaService.lectureNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Original Note (복사본)',
          type: 'student',
          publicAccess: 'PRIVATE',
        }),
      });

      expect(mockPrismaService.file.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when user has no access', async () => {
      // Mock checkNoteAccess - no access
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      mockPrismaService.lectureNote.findFirst.mockResolvedValue(null);

      await expect(service.copyNoteToMyFolder(userId, sourceNoteId, targetFolderId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should create default folder if no target folder specified and user has no folders', async () => {
      // Mock checkNoteAccess - user has access via public
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce(null) // checkNoteAccess - not owner
        .mockResolvedValueOnce({ // Get source note
          noteId: sourceNoteId,
          note: {
            id: sourceNoteId,
            title: 'Shared Note',
            type: 'educator',
            publicAccess: 'PUBLIC_READ',
          },
        });

      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: sourceNoteId,
        publicAccess: 'PUBLIC_READ',
      });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      // No existing folder
      mockPrismaService.folder.findFirst
        .mockResolvedValueOnce(null) // First call - looking for default folder
        .mockResolvedValueOnce({ // Second call - verifying target folder
          id: 'new-folder-1',
          name: 'My Notes',
          userId,
        });

      mockPrismaService.folder.create.mockResolvedValue({
        id: 'new-folder-1',
        name: 'My Notes',
        userId,
      });

      mockPrismaService.lectureNote.create.mockResolvedValue({
        id: 'new-note-1',
        title: 'Shared Note (복사본)',
        type: 'student',
        publicAccess: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.folderLectureNote.create.mockResolvedValue({
        noteId: 'new-note-1',
        folderId: 'new-folder-1',
      });

      mockPrismaService.noteContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.notePageContent.findMany.mockResolvedValue([]);
      mockPrismaService.audioRecording.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([]);

      const result = await service.copyNoteToMyFolder(userId, sourceNoteId);

      expect(result).toMatchObject({
        id: 'new-note-1',
        title: 'Shared Note (복사본)',
        folder_id: 'new-folder-1',
      });

      expect(mockPrismaService.folder.create).toHaveBeenCalledWith({
        data: {
          name: 'My Notes',
          userId,
        },
      });
    });

    it('should throw NotFoundException when source note does not exist', async () => {
      // Mock checkNoteAccess - user has access
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce({ id: 'link' }) // checkNoteAccess passes
        .mockResolvedValueOnce(null); // Source note not found

      await expect(service.copyNoteToMyFolder(userId, sourceNoteId, targetFolderId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should use custom title when provided', async () => {
      const customTitle = 'My Custom Note Title';

      // Mock checkNoteAccess - user has access
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce({ id: 'owner-link' })
        .mockResolvedValueOnce({
          noteId: sourceNoteId,
          note: {
            id: sourceNoteId,
            title: 'Original Note',
            type: 'educator',
            publicAccess: 'PUBLIC_READ',
          },
        });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrismaService.folder.findFirst.mockResolvedValue({
        id: targetFolderId,
        name: 'My Folder',
        userId,
      });

      mockPrismaService.lectureNote.create.mockResolvedValue({
        id: 'new-note-1',
        title: customTitle,
        type: 'student',
        publicAccess: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.folderLectureNote.create.mockResolvedValue({
        noteId: 'new-note-1',
        folderId: targetFolderId,
      });

      mockPrismaService.noteContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.notePageContent.findMany.mockResolvedValue([]);
      mockPrismaService.audioRecording.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([]);

      const result = await service.copyNoteToMyFolder(userId, sourceNoteId, targetFolderId, customTitle);

      expect(result).toMatchObject({
        id: 'new-note-1',
        title: customTitle,
      });

      expect(mockPrismaService.lectureNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: customTitle,
        }),
      });
    });

    it('should use default title format when customTitle is empty string', async () => {
      // Mock checkNoteAccess - user has access
      mockPrismaService.folderLectureNote.findFirst
        .mockResolvedValueOnce({ id: 'owner-link' })
        .mockResolvedValueOnce({
          noteId: sourceNoteId,
          note: {
            id: sourceNoteId,
            title: 'Original Note',
            type: 'educator',
            publicAccess: 'PUBLIC_READ',
          },
        });

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });

      mockPrismaService.folder.findFirst.mockResolvedValue({
        id: targetFolderId,
        name: 'My Folder',
        userId,
      });

      mockPrismaService.lectureNote.create.mockResolvedValue({
        id: 'new-note-1',
        title: 'Original Note (복사본)',
        type: 'student',
        publicAccess: 'PRIVATE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrismaService.folderLectureNote.create.mockResolvedValue({
        noteId: 'new-note-1',
        folderId: targetFolderId,
      });

      mockPrismaService.noteContent.findUnique.mockResolvedValue(null);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.notePageContent.findMany.mockResolvedValue([]);
      mockPrismaService.audioRecording.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([]);

      // Pass empty string as customTitle
      const result = await service.copyNoteToMyFolder(userId, sourceNoteId, targetFolderId, '   ');

      expect(result).toMatchObject({
        id: 'new-note-1',
        title: 'Original Note (복사본)',
      });

      expect(mockPrismaService.lectureNote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Original Note (복사본)',
        }),
      });
    });
  });
});


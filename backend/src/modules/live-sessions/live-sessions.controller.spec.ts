import { Test, TestingModule } from '@nestjs/testing';
import { LiveSessionsController } from './live-sessions.controller';
import { LiveSessionsService } from './live-sessions.service';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';
import { CreateLiveSessionDto, CreateInviteDto, CreateSharedNoteDto, CreateTypingSectionDto, UpdateTypingSectionDto, FinalizeSessionDto } from './dto';

describe('LiveSessionsController', () => {
  let controller: LiveSessionsController;
  let _service: LiveSessionsService; // eslint-disable-line @typescript-eslint/no-unused-vars

  const mockSessionsService = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findOne: jest.fn(),
    endSession: jest.fn(),
    createInvite: jest.fn(),
    joinSession: jest.fn(),
    leaveSession: jest.fn(),
    getMembers: jest.fn(),
    getSharedNotes: jest.fn(),
    addSharedNote: jest.fn(),
    removeSharedNote: jest.fn(),
    createTypingSection: jest.fn(),
    updateTypingSection: jest.fn(),
    deleteTypingSection: jest.fn(),
    getTypingSections: jest.fn(),
    finalizeSessionForStudent: jest.fn(),
  };

  const mockHalService = {
    resource: jest.fn((data: Record<string, unknown>, links: Record<string, unknown>) => ({ ...data, _links: links })),
    collection: jest.fn((items: unknown[], options: Record<string, unknown>) => ({
      items,
      _links: { self: { href: options.selfHref } },
    })),
  };

  const mockLinkBuilder = {
    self: jest.fn((path: string) => ({ href: path })),
    action: jest.fn((path: string, method: string) => ({ href: path, method })),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveSessionsController],
      providers: [
        { provide: LiveSessionsService, useValue: mockSessionsService },
        { provide: HalService, useValue: mockHalService },
        { provide: LinkBuilderService, useValue: mockLinkBuilder },
      ],
    }).compile();

    controller = module.get<LiveSessionsController>(LiveSessionsController);
    _service = module.get<LiveSessionsService>(LiveSessionsService);
  });

  describe('create', () => {
    it('should create a new live session', async () => {
      // Arrange
      const userId = 'user-1';
      const dto: CreateLiveSessionDto = {
        noteId: 'note-1',
        title: 'Test Session',
      };
      const mockSession = {
        id: 'session-1',
        noteId: 'note-1',
        presenterId: userId,
        title: 'Test Session',
      };
      const mockUser = { id: userId };

      mockSessionsService.create.mockResolvedValue(mockSession);
      mockHalService.resource.mockReturnValue({ ...mockSession, _links: {} });

      // Act
      const result = await controller.create(dto, mockUser);

      // Assert
      expect(mockSessionsService.create).toHaveBeenCalledWith(userId, dto);
      expect(mockHalService.resource).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return all active sessions for user', async () => {
      // Arrange
      const userId = 'user-1';
      const mockSessions = [
        { id: 'session-1', noteId: 'note-1' },
        { id: 'session-2', noteId: 'note-2' },
      ];
      const mockUser = { id: userId };

      mockSessionsService.findAllForUser.mockResolvedValue(mockSessions);
      mockHalService.collection.mockReturnValue({
        items: mockSessions,
        _links: { self: { href: '/api/live-sessions' } },
      });

      // Act
      const result = await controller.findAll(mockUser);

      // Assert
      expect(mockSessionsService.findAllForUser).toHaveBeenCalledWith(userId);
      expect(result.items).toEqual(mockSessions);
    });
  });

  describe('findOne', () => {
    it('should return a session by ID', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockSession = {
        id: sessionId,
        noteId: 'note-1',
        presenterId: 'presenter-1',
      };
      const mockUser = { id: userId };

      mockSessionsService.findOne.mockResolvedValue(mockSession);
      mockHalService.resource.mockReturnValue({ ...mockSession, _links: {} });

      // Act
      const result = await controller.findOne(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.findOne).toHaveBeenCalledWith(sessionId, userId);
      expect(result).toBeDefined();
    });
  });

  describe('endSession', () => {
    it('should end a session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'presenter-1';
      const mockUser = { id: userId };

      mockSessionsService.endSession.mockResolvedValue({
        id: sessionId,
        isActive: false,
      });

      // Act
      await controller.endSession(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.endSession).toHaveBeenCalledWith(sessionId, userId);
    });
  });

  describe('createInvite', () => {
    it('should create an invite token', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'presenter-1';
      const dto: CreateInviteDto = {
        role: 'listener',
        maxUses: 30,
        expiresInMinutes: 120,
      };
      const mockInvite = {
        id: 'invite-1',
        sessionId,
        token: 'abc123',
        expiresAt: new Date(),
      };
      const mockUser = { id: userId };

      mockSessionsService.createInvite.mockResolvedValue(mockInvite);
      mockHalService.resource.mockReturnValue({ ...mockInvite, _links: {} });

      // Act
      const result = await controller.createInvite(sessionId, dto, mockUser);

      // Assert
      expect(mockSessionsService.createInvite).toHaveBeenCalledWith(sessionId, userId, dto);
      expect(result).toBeDefined();
    });
  });

  describe('joinSession', () => {
    it('should join a session with valid token', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user-1';
      const dto = {};
      const mockSession = {
        id: 'session-1',
        noteId: 'note-1',
      };
      const mockUser = { id: userId };

      mockSessionsService.joinSession.mockResolvedValue(mockSession);
      mockHalService.resource.mockReturnValue({ ...mockSession, _links: {} });

      // Act
      const result = await controller.joinSession(token, dto, mockUser);

      // Assert
      expect(mockSessionsService.joinSession).toHaveBeenCalledWith(token, userId, dto);
      expect(result).toBeDefined();
    });
  });

  describe('leaveSession', () => {
    it('should leave a session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockUser = { id: userId };

      mockSessionsService.leaveSession.mockResolvedValue(undefined);

      // Act
      await controller.leaveSession(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.leaveSession).toHaveBeenCalledWith(sessionId, userId);
    });
  });

  describe('getMembers', () => {
    it('should return all members of a session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockMembers = [
        { id: 'member-1', userId: 'user-1', role: 'presenter' },
        { id: 'member-2', userId: 'user-2', role: 'listener' },
      ];
      const mockUser = { id: userId };

      mockSessionsService.getMembers.mockResolvedValue(mockMembers);
      mockHalService.collection.mockReturnValue({
        items: mockMembers,
        _links: { self: { href: `/api/live-sessions/${sessionId}/members` } },
      });

      // Act
      const result = await controller.getMembers(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.getMembers).toHaveBeenCalledWith(sessionId, userId);
      expect(result.items).toEqual(mockMembers);
    });
  });

  describe('getSharedNotes', () => {
    it('should return all shared notes in a session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockSyncs = [
        { id: 'sync-1', sessionId, noteId: 'note-1' },
        { id: 'sync-2', sessionId, noteId: 'note-2' },
      ];
      const mockUser = { id: userId };

      mockSessionsService.getSharedNotes.mockResolvedValue(mockSyncs);
      mockHalService.collection.mockReturnValue({
        items: mockSyncs,
        _links: { self: { href: `/api/live-sessions/${sessionId}/shared-notes` } },
      });

      // Act
      const result = await controller.getSharedNotes(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.getSharedNotes).toHaveBeenCalledWith(sessionId, userId);
      expect(result.items).toEqual(mockSyncs);
    });
  });

  describe('addSharedNote', () => {
    it('should add a shared note to session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'presenter-1';
      const dto: CreateSharedNoteDto = {
        noteId: 'note-1',
        mode: 'COPY',
        excludeTyping: true,
      };
      const mockSync = {
        id: 'sync-1',
        sessionId,
        noteId: 'note-1',
        mode: 'COPY',
        excludeTyping: true,
      };
      const mockUser = { id: userId };

      mockSessionsService.addSharedNote.mockResolvedValue(mockSync);
      mockHalService.resource.mockReturnValue({ ...mockSync, _links: {} });

      // Act
      const result = await controller.addSharedNote(sessionId, dto, mockUser);

      // Assert
      expect(mockSessionsService.addSharedNote).toHaveBeenCalledWith(sessionId, userId, dto);
      expect(result).toBeDefined();
    });
  });

  describe('removeSharedNote', () => {
    it('should remove a shared note from session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const noteId = 'note-1';
      const userId = 'presenter-1';
      const mockUser = { id: userId };

      mockSessionsService.removeSharedNote.mockResolvedValue(undefined);

      // Act
      await controller.removeSharedNote(sessionId, noteId, mockUser);

      // Assert
      expect(mockSessionsService.removeSharedNote).toHaveBeenCalledWith(sessionId, noteId, userId);
    });
  });

  describe('createTypingSection', () => {
    it('should create a typing section for student', async () => {
      // Arrange
      const userId = 'student-1';
      const dto: CreateTypingSectionDto = {
        sessionId: 'session-1',
        noteId: 'note-1',
        title: 'My Notes',
        content: 'Content here',
        startSec: 0,
        endSec: 60,
      };
      const mockTypingSection = {
        id: 'typing-1',
        ...dto,
        userId,
      };
      const mockUser = { id: userId };

      mockSessionsService.createTypingSection.mockResolvedValue(mockTypingSection);
      mockHalService.resource.mockReturnValue({ ...mockTypingSection, _links: {} });

      // Act
      const result = await controller.createTypingSection(dto, mockUser);

      // Assert
      expect(mockSessionsService.createTypingSection).toHaveBeenCalledWith(userId, dto);
      expect(result).toBeDefined();
    });
  });

  describe('updateTypingSection', () => {
    it('should update a typing section', async () => {
      // Arrange
      const typingSectionId = 'typing-1';
      const userId = 'student-1';
      const dto: UpdateTypingSectionDto = {
        title: 'Updated Title',
        content: 'Updated Content',
      };
      const mockTypingSection = {
        id: typingSectionId,
        userId,
        ...dto,
      };
      const mockUser = { id: userId };

      mockSessionsService.updateTypingSection.mockResolvedValue(mockTypingSection);
      mockHalService.resource.mockReturnValue({ ...mockTypingSection, _links: {} });

      // Act
      const result = await controller.updateTypingSection(typingSectionId, dto, mockUser);

      // Assert
      expect(mockSessionsService.updateTypingSection).toHaveBeenCalledWith(
        typingSectionId,
        userId,
        dto,
      );
      expect(result).toBeDefined();
    });
  });

  describe('deleteTypingSection', () => {
    it('should delete a typing section', async () => {
      // Arrange
      const typingSectionId = 'typing-1';
      const userId = 'student-1';
      const mockUser = { id: userId };

      mockSessionsService.deleteTypingSection.mockResolvedValue(undefined);

      // Act
      await controller.deleteTypingSection(typingSectionId, mockUser);

      // Assert
      expect(mockSessionsService.deleteTypingSection).toHaveBeenCalledWith(typingSectionId, userId);
    });
  });

  describe('getTypingSections', () => {
    it('should return all typing sections for user in session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'student-1';
      const mockTypingSections = [
        { id: 'typing-1', sessionId, userId, title: 'Notes 1' },
        { id: 'typing-2', sessionId, userId, title: 'Notes 2' },
      ];
      const mockUser = { id: userId };

      mockSessionsService.getTypingSections.mockResolvedValue(mockTypingSections);
      mockHalService.collection.mockReturnValue({
        items: mockTypingSections,
        _links: { self: { href: `/api/live-sessions/${sessionId}/typing-sections` } },
      });

      // Act
      const result = await controller.getTypingSections(sessionId, mockUser);

      // Assert
      expect(mockSessionsService.getTypingSections).toHaveBeenCalledWith(sessionId, userId);
      expect(result.items).toEqual(mockTypingSections);
    });
  });

  describe('finalizeSession', () => {
    it('should finalize session and create student note', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'student-1';
      const dto: FinalizeSessionDto = {
        noteTitle: 'My Lecture Notes',
      };
      const mockResult = {
        studentNote: {
          id: 'student-note-1',
          title: dto.noteTitle,
        },
        copiedContent: {
          transcriptsCount: 10,
          translationsCount: 10,
          materialPagesCount: 5,
          typingSectionsCount: 3,
        },
      };
      const mockUser = { id: userId };

      mockSessionsService.finalizeSessionForStudent.mockResolvedValue(mockResult);
      mockHalService.resource.mockReturnValue({ ...mockResult, _links: {} });

      // Act
      const result = await controller.finalizeSession(sessionId, dto, mockUser);

      // Assert
      expect(mockSessionsService.finalizeSessionForStudent).toHaveBeenCalledWith(
        sessionId,
        userId,
        dto,
      );
      expect(result).toBeDefined();
      // hal.resource wraps the data, so check the structure
      expect(mockHalService.resource).toHaveBeenCalledWith(
        expect.objectContaining({
          note: mockResult.studentNote,
          copiedContent: mockResult.copiedContent,
        }),
        expect.any(Object),
      );
    });
  });
});


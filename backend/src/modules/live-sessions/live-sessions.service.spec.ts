import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { LiveSessionsService } from './live-sessions.service';
import { PrismaService } from '../db/prisma.service';
import { CreateLiveSessionDto, CreateInviteDto, JoinSessionDto, CreateSharedNoteDto, CreateTypingSectionDto, UpdateTypingSectionDto, FinalizeSessionDto } from './dto';

describe('LiveSessionsService', () => {
  let service: LiveSessionsService;

  const mockPrismaService = {
    liveSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    sessionMember: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    sessionInvite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    lectureNote: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    sectionSync: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    typingSection: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transcriptSegment: {
      create: jest.fn(),
    },
    translationSegment: {
      create: jest.fn(),
    },
    materialPage: {
      create: jest.fn(),
    },
    audioRecording: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveSessionsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LiveSessionsService>(LiveSessionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should create a new live session', async () => {
      // Arrange
      const userId = 'user-1';
      const dto: CreateLiveSessionDto = {
        noteId: 'note-1',
        title: 'Test Session',
      };
      const mockNote = { id: 'note-1', title: 'Test Note' };
      const mockSession = {
        id: 'session-1',
        noteId: 'note-1',
        presenterId: userId,
        title: 'Test Session',
        liveblocksRoomId: expect.any(String),
        note: mockNote,
        presenter: { id: userId, displayName: 'Presenter', email: 'presenter@test.com' },
      };

      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.liveSession.create.mockResolvedValue(mockSession);
      mockPrismaService.sessionMember.create.mockResolvedValue({});

      // Act
      const result = await service.create(userId, dto);

      // Assert
      expect(mockPrismaService.lectureNote.findUnique).toHaveBeenCalledWith({
        where: { id: dto.noteId },
      });
      expect(mockPrismaService.liveSession.create).toHaveBeenCalled();
      expect(mockPrismaService.sessionMember.create).toHaveBeenCalledWith({
        data: {
          sessionId: mockSession.id,
          userId,
          role: 'presenter',
        },
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException if note does not exist', async () => {
      // Arrange
      const userId = 'user-1';
      const dto: CreateLiveSessionDto = {
        noteId: 'non-existent',
        title: 'Test Session',
      };

      mockPrismaService.lectureNote.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.create(userId, dto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.liveSession.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should return all active sessions for a user', async () => {
      // Arrange
      const userId = 'user-1';
      const mockMemberships = [
        {
          session: {
            id: 'session-1',
            noteId: 'note-1',
            presenterId: 'presenter-1',
            isActive: true,
            note: { id: 'note-1', title: 'Test Note' },
            presenter: { id: 'presenter-1', displayName: 'Presenter' },
            members: [],
          },
        },
      ];

      mockPrismaService.sessionMember.findMany.mockResolvedValue(mockMemberships);

      // Act
      const result = await service.findAllForUser(userId);

      // Assert
      expect(mockPrismaService.sessionMember.findMany).toHaveBeenCalledWith({
        where: { userId, leftAt: null },
        include: expect.any(Object),
      });
      expect(result).toEqual([mockMemberships[0].session]);
    });
  });

  describe('findOne', () => {
    it('should return a session if user is a member', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockSession = {
        id: sessionId,
        noteId: 'note-1',
        presenterId: 'presenter-1',
        isActive: true,
        note: { id: 'note-1' },
        presenter: { id: 'presenter-1' },
        members: [],
        sectionSyncs: [],
      };

      mockPrismaService.sessionMember.findFirst.mockResolvedValue({ id: 'member-1' });
      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);

      // Act
      const result = await service.findOne(sessionId, userId);

      // Assert
      expect(mockPrismaService.sessionMember.findFirst).toHaveBeenCalledWith({
        where: { sessionId, userId },
      });
      expect(result).toEqual(mockSession);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';

      mockPrismaService.sessionMember.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne(sessionId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('endSession', () => {
    it('should end an active session', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'presenter-1';
      const mockSession = {
        id: sessionId,
        presenterId: userId,
        isActive: true,
      };

      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.liveSession.update.mockResolvedValue({
        ...mockSession,
        isActive: false,
        endedAt: new Date(),
      });

      // Act
      await service.endSession(sessionId, userId);

      // Assert
      expect(mockPrismaService.liveSession.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
      expect(mockPrismaService.liveSession.update).toHaveBeenCalledWith({
        where: { id: sessionId },
        data: { isActive: false, endedAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenException if user is not presenter', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'user-1';
      const mockSession = {
        id: sessionId,
        presenterId: 'presenter-1',
      };

      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.endSession(sessionId, userId)).rejects.toThrow(ForbiddenException);
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
      const mockSession = {
        id: sessionId,
        presenterId: userId,
      };
      const mockInvite = {
        id: 'invite-1',
        sessionId,
        token: 'abc123',
        expiresAt: expect.any(Date),
        maxUses: 30,
      };

      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.sessionInvite.create.mockResolvedValue(mockInvite);

      // Act
      const result = await service.createInvite(sessionId, userId, dto);

      // Assert
      expect(mockPrismaService.liveSession.findUnique).toHaveBeenCalledWith({
        where: { id: sessionId },
      });
      expect(mockPrismaService.sessionInvite.create).toHaveBeenCalled();
      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });
  });

  describe('joinSession', () => {
    it('should join a session with valid token', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user-1';
      const dto: JoinSessionDto = {};
      const mockSession = {
        id: 'session-1',
        noteId: 'note-1',
        presenterId: 'presenter-1',
      };
      const mockInvite = {
        id: 'invite-1',
        sessionId: 'session-1',
        token,
        expiresAt: new Date(Date.now() + 3600000),
        maxUses: 30,
        usedCount: 0,
        isActive: true,
        session: mockSession,
      };

      // Mock validateInviteToken (which calls findUnique with include)
      mockPrismaService.sessionInvite.findUnique.mockResolvedValue(mockInvite);
      mockPrismaService.sessionMember.findFirst.mockResolvedValue(null);
      mockPrismaService.sessionMember.create.mockResolvedValue({});
      mockPrismaService.sessionInvite.update.mockResolvedValue({
        ...mockInvite,
        usedCount: 1,
      });

      // Act
      const result = await service.joinSession(token, userId, dto);

      // Assert
      expect(mockPrismaService.sessionInvite.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.sessionMember.create).toHaveBeenCalled();
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException if token is invalid', async () => {
      // Arrange
      const token = 'invalid-token';
      const userId = 'user-1';
      const dto: JoinSessionDto = {};

      mockPrismaService.sessionInvite.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.joinSession(token, userId, dto)).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.sessionMember.create).not.toHaveBeenCalled();
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
      const mockSession = { id: sessionId, presenterId: userId };
      const mockNote = { id: 'note-1', title: 'Test Note' };
      const mockSync = {
        id: 'sync-1',
        sessionId,
        noteId: 'note-1',
        mode: 'COPY',
        excludeTyping: true,
        note: mockNote,
      };

      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.sectionSync.findFirst.mockResolvedValue(null);
      mockPrismaService.sectionSync.create.mockResolvedValue(mockSync);

      // Act
      const result = await service.addSharedNote(sessionId, userId, dto);

      // Assert
      expect(mockPrismaService.lectureNote.findUnique).toHaveBeenCalledWith({
        where: { id: dto.noteId },
      });
      expect(mockPrismaService.sectionSync.create).toHaveBeenCalled();
      expect(result).toEqual(mockSync);
    });

    it('should throw ConflictException if note is already shared', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'presenter-1';
      const dto: CreateSharedNoteDto = {
        noteId: 'note-1',
        mode: 'COPY',
      };
      const mockSession = { id: sessionId, presenterId: userId };
      const mockNote = { id: 'note-1' };
      const existingSync = { id: 'sync-1' };

      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.sectionSync.findFirst.mockResolvedValue(existingSync);

      // Act & Assert
      await expect(service.addSharedNote(sessionId, userId, dto)).rejects.toThrow(ConflictException);
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
      const mockMember = { id: 'member-1', sessionId: 'session-1', userId };
      const mockNote = { id: 'note-1' };
      const mockTypingSection = {
        id: 'typing-1',
        ...dto,
        userId,
      };

      mockPrismaService.sessionMember.findFirst.mockResolvedValue(mockMember);
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.typingSection.create.mockResolvedValue(mockTypingSection);

      // Act
      const result = await service.createTypingSection(userId, dto);

      // Assert
      expect(mockPrismaService.sessionMember.findFirst).toHaveBeenCalledWith({
        where: { sessionId: dto.sessionId, userId },
      });
      expect(mockPrismaService.typingSection.create).toHaveBeenCalled();
      expect(result).toEqual(mockTypingSection);
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      // Arrange
      const userId = 'user-1';
      const dto: CreateTypingSectionDto = {
        sessionId: 'session-1',
        noteId: 'note-1',
        title: 'My Notes',
        content: 'Content',
      };

      mockPrismaService.sessionMember.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.createTypingSection(userId, dto)).rejects.toThrow(ForbiddenException);
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
        title: 'Old Title',
        content: 'Old Content',
      };
      const updatedTypingSection = {
        ...mockTypingSection,
        ...dto,
      };

      mockPrismaService.typingSection.findUnique.mockResolvedValue(mockTypingSection);
      mockPrismaService.typingSection.update.mockResolvedValue(updatedTypingSection);

      // Act
      const result = await service.updateTypingSection(typingSectionId, userId, dto);

      // Assert
      expect(mockPrismaService.typingSection.findUnique).toHaveBeenCalledWith({
        where: { id: typingSectionId },
      });
      expect(mockPrismaService.typingSection.update).toHaveBeenCalled();
      expect(result).toEqual(updatedTypingSection);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      // Arrange
      const typingSectionId = 'typing-1';
      const userId = 'user-1';
      const dto: UpdateTypingSectionDto = { title: 'Updated' };
      const mockTypingSection = {
        id: typingSectionId,
        userId: 'other-user',
      };

      mockPrismaService.typingSection.findUnique.mockResolvedValue(mockTypingSection);

      // Act & Assert
      await expect(service.updateTypingSection(typingSectionId, userId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('finalizeSessionForStudent', () => {
    it('should create student note with shared content and typing sections', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'student-1';
      const dto: FinalizeSessionDto = {
        noteTitle: 'My Lecture Notes',
      };
      const mockSession = {
        id: sessionId,
        isActive: false,
        note: {
          id: 'note-1',
          sourceFileUrl: 'source.pdf',
          audioFileUrl: 'audio.mp3',
        },
        sectionSyncs: [
          {
            mode: 'COPY',
            note: {
              id: 'shared-note-1',
              transcript: [{ id: 't1', startSec: 0, endSec: 10, text: 'Hello' }],
              translations: [{ id: 'tr1', startSec: 0, endSec: 10, text: '안녕' }],
              materialPages: [{ id: 'p1', pageNumber: 1, pageUrl: 'page1.jpg' }],
              audioRecordings: [{ id: 'a1', fileUrl: 'audio1.mp3', durationSec: 10 }],
            },
          },
        ],
      };
      const mockStudentTypingSections = [
        { id: 'typing-1', title: 'My Notes', content: 'Content', startSec: 0, endSec: 60 },
      ];
      const mockStudentNote = {
        id: 'student-note-1',
        title: dto.noteTitle,
      };

      mockPrismaService.sessionMember.findFirst.mockResolvedValue({ id: 'member-1' });
      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);
      mockPrismaService.typingSection.findMany.mockResolvedValue(mockStudentTypingSections);
      mockPrismaService.lectureNote.create.mockResolvedValue(mockStudentNote);
      mockPrismaService.transcriptSegment.create.mockResolvedValue({});
      mockPrismaService.translationSegment.create.mockResolvedValue({});
      mockPrismaService.materialPage.create.mockResolvedValue({});
      mockPrismaService.audioRecording.create.mockResolvedValue({});
      mockPrismaService.typingSection.update.mockResolvedValue({});

      // Act
      const result = await service.finalizeSessionForStudent(sessionId, userId, dto);

      // Assert
      expect(mockPrismaService.liveSession.findUnique).toHaveBeenCalled();
      expect(mockPrismaService.lectureNote.create).toHaveBeenCalled();
      expect(result.studentNote).toEqual(mockStudentNote);
      expect(result.copiedContent).toBeDefined();
    });

    it('should throw BadRequestException if session is still active', async () => {
      // Arrange
      const sessionId = 'session-1';
      const userId = 'student-1';
      const dto: FinalizeSessionDto = { noteTitle: 'My Notes' };
      const mockSession = {
        id: sessionId,
        isActive: true,
      };

      mockPrismaService.sessionMember.findFirst.mockResolvedValue({ id: 'member-1' });
      mockPrismaService.liveSession.findUnique.mockResolvedValue(mockSession);

      // Act & Assert
      await expect(service.finalizeSessionForStudent(sessionId, userId, dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('assertSessionMember', () => {
    it('should not throw if user is a member', async () => {
      // Arrange
      const userId = 'user-1';
      const sessionId = 'session-1';
      mockPrismaService.sessionMember.findFirst.mockResolvedValue({ id: 'member-1' });

      // Act & Assert
      await expect(service.assertSessionMember(userId, sessionId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      // Arrange
      const userId = 'user-1';
      const sessionId = 'session-1';
      mockPrismaService.sessionMember.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.assertSessionMember(userId, sessionId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('assertPresenter', () => {
    it('should not throw if user is presenter', async () => {
      // Arrange
      const userId = 'presenter-1';
      const sessionId = 'session-1';
      mockPrismaService.liveSession.findUnique.mockResolvedValue({
        id: sessionId,
        presenterId: userId,
      });

      // Act & Assert
      await expect(service.assertPresenter(userId, sessionId)).resolves.not.toThrow();
    });

    it('should throw ForbiddenException if user is not presenter', async () => {
      // Arrange
      const userId = 'user-1';
      const sessionId = 'session-1';
      mockPrismaService.liveSession.findUnique.mockResolvedValue({
        id: sessionId,
        presenterId: 'presenter-1',
      });

      // Act & Assert
      await expect(service.assertPresenter(userId, sessionId)).rejects.toThrow(ForbiddenException);
    });
  });
});


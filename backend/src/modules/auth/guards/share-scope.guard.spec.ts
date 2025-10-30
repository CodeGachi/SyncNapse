import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ShareScopeGuard } from './share-scope.guard';
import { PrismaService } from '../../db/prisma.service';
import { AuthCacheService } from '../services/auth-cache.service';
import { ShareScopeMeta } from '../share-scope.decorator';

describe('ShareScopeGuard', () => {
  let guard: ShareScopeGuard;
  let reflector: Reflector;
  let prismaService: PrismaService;
  let authCacheService: AuthCacheService;

  const mockPrisma = {
    question: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    audioRecording: {
      findUnique: jest.fn(),
    },
  };

  const mockAuthCache = {
    getCachedUser: jest.fn(),
    setCachedUser: jest.fn(),
    invalidateUser: jest.fn(),
    getOrCompute: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    reflector = new Reflector();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prismaService = mockPrisma as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    authCacheService = mockAuthCache as any;
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    mockAuthCache.getOrCompute.mockImplementation(async (key: string, compute: () => Promise<unknown>, _ttl?: number) => {
      return await compute();
    });
    
    guard = new ShareScopeGuard(reflector, prismaService, authCacheService);
  });

  const createMockExecutionContext = (
    user?: { id?: string; role?: string },
    params: Record<string, string> = {},
    meta?: ShareScopeMeta,
  ): ExecutionContext => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user, params }),
      }),
    } as unknown as ExecutionContext;

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(meta ?? null);

    return mockContext;
  };

  describe('canActivate', () => {
    describe('when no ShareScope metadata is present', () => {
      it('should allow access by default', async () => {
        // Arrange
        const context = createMockExecutionContext({ id: 'user-1' }, {}, undefined);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('when user is not authenticated', () => {
      it('should deny access when user is undefined', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(undefined, { noteId: 'note-1' }, meta);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });

      it('should deny access when user has no id', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext({}, { noteId: 'note-1' }, meta);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('when user is admin', () => {
      it('should allow access to any resource', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'admin-1', role: 'admin' },
          { noteId: 'note-1' },
          meta,
        );

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.question.findFirst).not.toHaveBeenCalled();
      });
    });

    describe('note resource', () => {
      it('should allow access when user has asked a question on the note', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read', noteIdParam: 'noteId' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-123' },
          meta,
        );
        mockPrisma.question.findFirst.mockResolvedValue({ id: 'question-1' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.question.findFirst).toHaveBeenCalledWith({
          where: { noteId: 'note-123', askedByUserId: 'user-1' },
          select: { id: true },
        });
      });

      it('should deny access when user has not asked any question on the note', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-123' },
          meta,
        );
        mockPrisma.question.findFirst.mockResolvedValue(null);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });

      it('should deny access when noteId is missing', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read', noteIdParam: 'noteId' };
        const context = createMockExecutionContext({ id: 'user-1', role: 'user' }, {}, meta);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
        expect(mockPrisma.question.findFirst).not.toHaveBeenCalled();
      });

      it('should use default noteIdParam when not specified', async () => {
        // Arrange - noteIdParam defaults to 'noteId'
        const meta: ShareScopeMeta = { resource: 'note', action: 'write' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-456' },
          meta,
        );
        mockPrisma.question.findFirst.mockResolvedValue({ id: 'q1' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.question.findFirst).toHaveBeenCalledWith({
          where: { noteId: 'note-456', askedByUserId: 'user-1' },
          select: { id: true },
        });
      });
    });

    describe('audio resource', () => {
      it('should allow access when user has asked a question on the related note', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'id' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'audio-123' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue({ noteId: 'note-1' });
        mockPrisma.question.findFirst.mockResolvedValue({ id: 'question-1' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.audioRecording.findUnique).toHaveBeenCalledWith({
          where: { id: 'audio-123' },
          select: { noteId: true },
        });
        expect(mockPrisma.question.findFirst).toHaveBeenCalledWith({
          where: { noteId: 'note-1', askedByUserId: 'user-1' },
          select: { id: true },
        });
      });

      it('should deny access when audio recording is not found', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'audioId' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { audioId: 'audio-999' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue(null);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
        expect(mockPrisma.question.findFirst).not.toHaveBeenCalled();
      });

      it('should deny access when audio has no associated noteId', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'id' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'audio-123' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue({ noteId: null });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });

      it('should deny access when audioId is missing', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'id' };
        const context = createMockExecutionContext({ id: 'user-1', role: 'user' }, {}, meta);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
        expect(mockPrisma.audioRecording.findUnique).not.toHaveBeenCalled();
      });

      it('should use default audioIdParam when not specified', async () => {
        // Arrange - audioIdParam defaults to 'id'
        const meta: ShareScopeMeta = { resource: 'audio', action: 'write' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'audio-789' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue({ noteId: 'note-5' });
        mockPrisma.question.findFirst.mockResolvedValue({ id: 'q5' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.audioRecording.findUnique).toHaveBeenCalledWith({
          where: { id: 'audio-789' },
          select: { noteId: true },
        });
      });
    });

    describe('question resource', () => {
      it('should allow access when user is the owner of the question', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'question', action: 'read', questionIdParam: 'id' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'question-123' },
          meta,
        );
        mockPrisma.question.findUnique.mockResolvedValue({ askedByUserId: 'user-1' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
          where: { id: 'question-123' },
          select: { askedByUserId: true },
        });
      });

      it('should deny access when user is not the owner of the question', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'question', action: 'write', questionIdParam: 'questionId' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { questionId: 'question-123' },
          meta,
        );
        mockPrisma.question.findUnique.mockResolvedValue({ askedByUserId: 'user-2' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });

      it('should deny access when question is not found', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'question', action: 'read', questionIdParam: 'id' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'question-999' },
          meta,
        );
        mockPrisma.question.findUnique.mockResolvedValue(null);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });

      it('should deny access when questionId is missing', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'question', action: 'read', questionIdParam: 'id' };
        const context = createMockExecutionContext({ id: 'user-1', role: 'user' }, {}, meta);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
        expect(mockPrisma.question.findUnique).not.toHaveBeenCalled();
      });

      it('should use default questionIdParam when not specified', async () => {
        // Arrange - questionIdParam defaults to 'id'
        const meta: ShareScopeMeta = { resource: 'question', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'question-abc' },
          meta,
        );
        mockPrisma.question.findUnique.mockResolvedValue({ askedByUserId: 'user-1' });

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mockPrisma.question.findUnique).toHaveBeenCalledWith({
          where: { id: 'question-abc' },
          select: { askedByUserId: true },
        });
      });
    });

    describe('error handling', () => {
      it('should return false and log error when database query fails', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-1' },
          meta,
        );
        const dbError = new Error('Database connection failed');
        mockPrisma.question.findFirst.mockRejectedValue(dbError);
        const loggerSpy = jest.spyOn(guard['logger'], 'debug');

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
        expect(loggerSpy).toHaveBeenCalled();
        const logMessage = loggerSpy.mock.calls.find((call) => call[0].includes('error='));
        expect(logMessage).toBeTruthy();
      });

      it('should handle unknown error types gracefully', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'question', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'question-1' },
          meta,
        );
        mockPrisma.question.findUnique.mockRejectedValue('string error');

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('logging', () => {
      it('should log resource, action, and user information', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'write' };
        const context = createMockExecutionContext(
          { id: 'user-123', role: 'user' },
          { noteId: 'note-1' },
          meta,
        );
        mockPrisma.question.findFirst.mockResolvedValue({ id: 'q1' });
        const loggerSpy = jest.spyOn(guard['logger'], 'debug');

        // Act
        await guard.canActivate(context);

        // Assert
        expect(loggerSpy).toHaveBeenCalled();
        const logMessage = loggerSpy.mock.calls[0][0];
        expect(logMessage).toContain('[ShareScope]');
        expect(logMessage).toContain('resource=note');
        expect(logMessage).toContain('action=write');
        expect(logMessage).toContain('user=user-123');
      });

      it('should log "anon" when user is not authenticated', async () => {
        // Arrange
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(undefined, { noteId: 'note-1' }, meta);
        const loggerSpy = jest.spyOn(guard['logger'], 'debug');

        // Act
        await guard.canActivate(context);

        // Assert
        expect(loggerSpy).toHaveBeenCalled();
        const logMessage = loggerSpy.mock.calls[0][0];
        expect(logMessage).toContain('user=anon');
      });
    });
  });
});
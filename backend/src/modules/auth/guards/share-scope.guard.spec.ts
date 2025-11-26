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
    lectureNote: {
      findUnique: jest.fn(),
    },
    audioRecording: {
      findUnique: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
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
        const context = createMockExecutionContext({ id: 'user-1' }, {}, undefined);
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('when user is not authenticated', () => {
      it('should deny access when user is undefined', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(undefined, { noteId: 'note-1' }, meta);
        const result = await guard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny access when user has no id', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext({}, { noteId: 'note-1' }, meta);
        const result = await guard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('when user is admin', () => {
      it('should allow access to any resource', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'admin-1', role: 'admin' },
          { noteId: 'note-1' },
          meta,
        );
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('note resource', () => {
      it('should allow access when user owns the note', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read', noteIdParam: 'noteId' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-123' },
          meta,
        );
        mockPrisma.lectureNote.findUnique.mockResolvedValue({
          id: 'note-123',
          foldersLink: [{ folder: { userId: 'user-1' } }]
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
        expect(mockPrisma.lectureNote.findUnique).toHaveBeenCalled();
      });

      it('should deny access when user does not own the note', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-123' },
          meta,
        );
        mockPrisma.lectureNote.findUnique.mockResolvedValue({
          id: 'note-123',
          foldersLink: [{ folder: { userId: 'user-2' } }]
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
      });

      it('should deny access when noteId is missing', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read', noteIdParam: 'noteId' };
        const context = createMockExecutionContext({ id: 'user-1', role: 'user' }, {}, meta);
        const result = await guard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('audio resource', () => {
      it('should allow access when user owns the related note', async () => {
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'id' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'audio-123' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue({ noteId: 'note-1' });
        mockPrisma.lectureNote.findUnique.mockResolvedValue({
          id: 'note-1',
          foldersLink: [{ folder: { userId: 'user-1' } }]
        });

        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });

      it('should deny access when audio recording is not found', async () => {
        const meta: ShareScopeMeta = { resource: 'audio', action: 'read', audioIdParam: 'audioId' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { audioId: 'audio-999' },
          meta,
        );
        mockPrisma.audioRecording.findUnique.mockResolvedValue(null);

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
      });
    });

    describe('question resource', () => {
      it('should always allow access (legacy behavior)', async () => {
        const meta: ShareScopeMeta = { resource: 'question', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { id: 'q-1' },
          meta,
        );
        const result = await guard.canActivate(context);
        expect(result).toBe(true);
      });
    });

    describe('error handling', () => {
      it('should return false and log error when database query fails', async () => {
        const meta: ShareScopeMeta = { resource: 'note', action: 'read' };
        const context = createMockExecutionContext(
          { id: 'user-1', role: 'user' },
          { noteId: 'note-1' },
          meta,
        );
        const dbError = new Error('Database connection failed');
        mockPrisma.lectureNote.findUnique.mockRejectedValue(dbError);
        const loggerSpy = jest.spyOn(guard['logger'], 'debug');

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
        expect(loggerSpy).toHaveBeenCalled();
      });
    });
  });
});

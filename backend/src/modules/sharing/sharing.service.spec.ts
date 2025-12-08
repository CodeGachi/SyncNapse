import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { SharingService } from './sharing.service';
import { PrismaService } from '../db/prisma.service';

describe('SharingService', () => {
  let service: SharingService;
  let mockPrismaService: any;

  const mockNote = {
    id: 'note-123',
    title: 'Test Note',
    publicAccess: 'PRIVATE',
    allowedDomains: [],
    foldersLink: [
      { folder: { userId: 'owner-123', id: 'folder-1' } }
    ],
  };

  const mockUser = {
    id: 'user-123',
    email: 'user@example.com',
    displayName: 'Test User',
  };

  const mockCollaborator = {
    id: 'collab-123',
    noteId: 'note-123',
    email: 'collab@example.com',
    userId: 'collab-user-123',
    permission: 'VIEWER',
    invitedBy: 'owner-123',
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockPrismaService = {
      lectureNote: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      noteCollaborator: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SharingService>(SharingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updatePublicAccess', () => {
    it('should update public access when user is owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.lectureNote.update.mockResolvedValue({
        ...mockNote,
        publicAccess: 'PUBLIC_READ',
      });

      const result = await service.updatePublicAccess('owner-123', 'note-123', {
        publicAccess: 'PUBLIC_READ',
      });

      expect(result.publicAccess).toBe('PUBLIC_READ');
      expect(mockPrismaService.lectureNote.update).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: { publicAccess: 'PUBLIC_READ' },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);

      await expect(
        service.updatePublicAccess('not-owner', 'note-123', { publicAccess: 'PUBLIC_READ' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when note does not exist', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePublicAccess('owner-123', 'nonexistent', { publicAccess: 'PUBLIC_READ' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAllowedDomains', () => {
    it('should update allowed domains with normalized values', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.lectureNote.update.mockResolvedValue({
        ...mockNote,
        allowedDomains: ['example.com', 'test.org'],
      });

      const result = await service.updateAllowedDomains('owner-123', 'note-123', {
        domains: ['  Example.COM  ', 'TEST.org', ''],
      });

      expect(mockPrismaService.lectureNote.update).toHaveBeenCalledWith({
        where: { id: 'note-123' },
        data: { allowedDomains: ['example.com', 'test.org'] },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);

      await expect(
        service.updateAllowedDomains('not-owner', 'note-123', { domains: ['example.com'] })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getCollaborators', () => {
    it('should return collaborators when user is owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.noteCollaborator.findMany.mockResolvedValue([
        { ...mockCollaborator, user: mockUser },
      ]);

      const result = await service.getCollaborators('owner-123', 'note-123');

      expect(result).toHaveLength(1);
      expect(result[0].email).toBe('collab@example.com');
    });

    it('should return collaborators when user is a collaborator', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue({ email: 'collab@example.com' });
      mockPrismaService.noteCollaborator.findUnique.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(mockCollaborator);
      mockPrismaService.noteCollaborator.findMany.mockResolvedValue([mockCollaborator]);

      const result = await service.getCollaborators('collab-user-123', 'note-123');

      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException when user has no access', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue({ email: 'random@example.com' });
      mockPrismaService.noteCollaborator.findUnique.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      await expect(
        service.getCollaborators('random-user', 'note-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('inviteCollaborator', () => {
    it('should create collaborator when user is owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.noteCollaborator.findUnique.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.create.mockResolvedValue(mockCollaborator);

      const result = await service.inviteCollaborator('owner-123', 'note-123', {
        email: 'newuser@example.com',
        permission: 'VIEWER',
      });

      expect(result).toEqual(mockCollaborator);
      expect(mockPrismaService.noteCollaborator.create).toHaveBeenCalled();
    });

    it('should throw ConflictException when user is already a collaborator', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.noteCollaborator.findUnique.mockResolvedValue(mockCollaborator);

      await expect(
        service.inviteCollaborator('owner-123', 'note-123', {
          email: 'collab@example.com',
          permission: 'VIEWER',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);

      await expect(
        service.inviteCollaborator('not-owner', 'note-123', {
          email: 'newuser@example.com',
          permission: 'VIEWER',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create collaborator without userId if user does not exist', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.findUnique.mockResolvedValue(null);
      mockPrismaService.noteCollaborator.create.mockResolvedValue({
        ...mockCollaborator,
        userId: null,
      });

      await service.inviteCollaborator('owner-123', 'note-123', {
        email: 'unregistered@example.com',
        permission: 'EDITOR',
      });

      expect(mockPrismaService.noteCollaborator.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'unregistered@example.com',
          userId: undefined,
        }),
      });
    });
  });

  describe('updateCollaborator', () => {
    it('should update collaborator permission', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.noteCollaborator.update.mockResolvedValue({
        ...mockCollaborator,
        permission: 'EDITOR',
      });

      const result = await service.updateCollaborator('owner-123', 'note-123', 'collab-123', {
        permission: 'EDITOR',
      });

      expect(result.permission).toBe('EDITOR');
      expect(mockPrismaService.noteCollaborator.update).toHaveBeenCalledWith({
        where: { id: 'collab-123' },
        data: { permission: 'EDITOR' },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);

      await expect(
        service.updateCollaborator('not-owner', 'note-123', 'collab-123', { permission: 'EDITOR' })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeCollaborator', () => {
    it('should remove collaborator when user is owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.noteCollaborator.delete.mockResolvedValue(mockCollaborator);

      const result = await service.removeCollaborator('owner-123', 'note-123', 'collab-123');

      expect(result).toEqual(mockCollaborator);
      expect(mockPrismaService.noteCollaborator.delete).toHaveBeenCalledWith({
        where: { id: 'collab-123' },
      });
    });

    it('should throw ForbiddenException when user is not owner', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);

      await expect(
        service.removeCollaborator('not-owner', 'note-123', 'collab-123')
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

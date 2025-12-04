import { Test, TestingModule } from '@nestjs/testing';
import { AudioService } from './audio.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotFoundException } from '@nestjs/common';

import { LoggingService } from '../logging/logging.service';

describe('AudioService', () => {
  let service: AudioService;

  const mockPrismaService = {
    folderLectureNote: {
      findFirst: jest.fn(),
    },
    lectureNote: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    audioRecording: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    audioTimelineEvent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    noteCollaborator: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockStorageService = {
    uploadFullAudio: jest.fn(),
    deleteFile: jest.fn(),
  };

  const mockLoggingService = {
    audit: jest.fn(),
  };

  const mockRecording = {
    id: 'rec-123',
    noteId: 'note-123',
    title: 'Test Recording',
    fileUrl: 'http://minio/bucket/key',
    storageKey: 'key',
    durationSec: 60,
    isActive: true,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: LoggingService, useValue: mockLoggingService },
      ],
    }).compile();

    service = module.get<AudioService>(AudioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRecording', () => {
    it('should create recording with file', async () => {
      // Arrange
      const dto = { noteId: 'note-123', title: 'Test' };
      const file = { buffer: Buffer.from('audio') } as Express.Multer.File;
      
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });
      mockPrismaService.lectureNote.findUnique.mockResolvedValue({ id: 'note-123' });
      mockStorageService.uploadFullAudio.mockResolvedValue({ url: 'url', key: 'key' });
      mockPrismaService.audioRecording.create.mockResolvedValue(mockRecording);

      // Act
      const result = await service.createRecording('user-1', dto, file);

      // Assert
      expect(result).toEqual(mockRecording);
      expect(mockStorageService.uploadFullAudio).toHaveBeenCalled();
      expect(mockPrismaService.audioRecording.create).toHaveBeenCalled();
    });
  });

  describe('addTimelineEvent', () => {
    it('should add event', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue(mockRecording);
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });
      mockPrismaService.audioTimelineEvent.create.mockResolvedValue({ id: 'event-1' });

      await service.addTimelineEvent('user-1', 'rec-123', { timestamp: 10, pageNumber: 1 });

      expect(mockPrismaService.audioTimelineEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ timestamp: 10, pageNumber: 1 }),
      });
    });
  });

  describe('getRecording', () => {
    const userId = 'user-1';
    const recordingId = 'rec-123';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return recording when user is the owner', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue({
        ...mockRecording,
        timelineEvents: [],
      });
      // checkNoteAccess - owner check passes
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue({ id: 'fn-1' });

      const result = await service.getRecording(userId, recordingId);

      expect(result).toMatchObject({
        id: recordingId,
        noteId: 'note-123',
      });
    });

    it('should return recording when user is a collaborator', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue({
        ...mockRecording,
        timelineEvents: [],
      });
      // Not owner
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      // Note exists
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: 'note-123',
        publicAccess: 'PRIVATE',
      });
      // User exists
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      // User is collaborator
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue({
        id: 'collab-1',
        noteId: 'note-123',
        userId,
      });

      const result = await service.getRecording(userId, recordingId);

      expect(result).toMatchObject({
        id: recordingId,
        noteId: 'note-123',
      });
    });

    it('should return recording when note has PUBLIC_READ access', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue({
        ...mockRecording,
        timelineEvents: [],
      });
      // Not owner
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      // Note exists with public access
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: 'note-123',
        publicAccess: 'PUBLIC_READ',
      });
      // User exists
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      // Not a collaborator
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      const result = await service.getRecording(userId, recordingId);

      expect(result).toMatchObject({
        id: recordingId,
        noteId: 'note-123',
      });
    });

    it('should throw NotFoundException when recording does not exist', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue(null);

      await expect(service.getRecording(userId, recordingId))
        .rejects
        .toThrow(NotFoundException);
    });

    it('should throw NotFoundException when user has no access', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue({
        ...mockRecording,
        timelineEvents: [],
      });
      // Not owner
      mockPrismaService.folderLectureNote.findFirst.mockResolvedValue(null);
      // Note exists but PRIVATE
      mockPrismaService.lectureNote.findFirst.mockResolvedValue({
        id: 'note-123',
        publicAccess: 'PRIVATE',
      });
      // User exists
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'user@example.com',
      });
      // Not a collaborator
      mockPrismaService.noteCollaborator.findFirst.mockResolvedValue(null);

      await expect(service.getRecording(userId, recordingId))
        .rejects
        .toThrow(NotFoundException);
    });
  });
});


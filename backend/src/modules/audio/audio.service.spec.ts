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
});


/**
 * TranscriptionService Unit Tests
 * Testing transcription session management business logic
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';
import { Prisma } from '@prisma/client';

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  // Mock data
  const mockUserId = 'user-123';
  const mockSessionId = 'session-123';
  const mockNoteId = 'note-123';
  const mockRecordingId = 'recording-123';

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    title: 'Test Session',
    noteId: mockNoteId,
    audioRecordingId: mockRecordingId,
    status: 'recording',
    duration: new Prisma.Decimal(0),
    fullAudioUrl: null,
    fullAudioKey: null,
    fullAudioSize: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    segments: [],
    audioChunks: [],
  };

  const mockNote = {
    id: mockNoteId,
    title: 'Test Note',
    deletedAt: null,
  };

  const mockRecording = {
    id: mockRecordingId,
    noteId: mockNoteId,
    note: {
      foldersLink: [{ folder: { userId: mockUserId } }],
    },
  };

  // Mock services
  const mockPrismaService = {
    transcriptionSession: {
      create: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
      update: jest.fn() as jest.Mock,
    },
    transcriptionSegment: {
      create: jest.fn() as jest.Mock,
      findUnique: jest.fn() as jest.Mock,
    },
    transcriptionWord: {
      createMany: jest.fn() as jest.Mock,
    },
    transcriptRevision: {
      findFirst: jest.fn() as jest.Mock,
      findMany: jest.fn() as jest.Mock,
      create: jest.fn() as jest.Mock,
    },
    audioRecording: {
      findUnique: jest.fn() as jest.Mock,
    },
    audioTimelineEvent: {
      create: jest.fn() as jest.Mock,
    },
    audioChunk: {
      create: jest.fn() as jest.Mock,
      findFirst: jest.fn() as jest.Mock,
    },
    lectureNote: {
      findUnique: jest.fn() as jest.Mock,
    },
    folderLectureNote: {
      findFirst: jest.fn() as jest.Mock,
    },
  };

  const mockStorageService = {
    uploadBuffer: jest.fn() as jest.Mock,
    uploadAudioChunk: jest.fn() as jest.Mock,
    uploadFullAudio: jest.fn() as jest.Mock,
    deleteFile: jest.fn() as jest.Mock,
    getFileStream: jest.fn() as jest.Mock,
    getPublicUrl: jest.fn() as jest.Mock,
  };

  const mockNotesService = {
    getNoteStoragePath: jest.fn() as jest.Mock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageService, useValue: mockStorageService },
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create session successfully', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(mockNote);
      mockPrismaService.transcriptionSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession(mockUserId, { title: 'Test Session', noteId: mockNoteId });

      expect(result.id).toBe(mockSessionId);
      expect(result.title).toBe('Test Session');
      expect(mockPrismaService.transcriptionSession.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when note not found', async () => {
      mockPrismaService.lectureNote.findUnique.mockResolvedValue(null);

      await expect(service.createSession(mockUserId, { title: 'Test', noteId: 'invalid-note' })).rejects.toThrow(NotFoundException);
    });

    it('should create session without noteId', async () => {
      mockPrismaService.transcriptionSession.create.mockResolvedValue({
        ...mockSession,
        noteId: null,
      });

      const result = await service.createSession(mockUserId, { title: 'Standalone Session' });

      expect(result).toBeDefined();
      expect(mockPrismaService.lectureNote.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('saveTimelineEvent', () => {
    it('should save timeline event', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue(mockRecording);
      mockPrismaService.audioTimelineEvent.create.mockResolvedValue({
        id: 'event-1',
        recordingId: mockRecordingId,
        timestamp: new Prisma.Decimal(10.5),
      });

      const result = await service.saveTimelineEvent(mockUserId, mockRecordingId, { timestamp: 10.5 });

      expect(result.id).toBe('event-1');
    });

    it('should throw NotFoundException when recording not found', async () => {
      mockPrismaService.audioRecording.findUnique.mockResolvedValue(null);

      await expect(service.saveTimelineEvent(mockUserId, 'invalid-id', { timestamp: 10 })).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveTranscriptRevision', () => {
    it('should create new revision', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.transcriptRevision.findFirst.mockResolvedValue(null);
      mockPrismaService.transcriptRevision.create.mockResolvedValue({
        id: 'rev-1',
        sessionId: mockSessionId,
        version: 1,
        content: { text: 'Hello' },
      });
      mockPrismaService.transcriptionSession.update.mockResolvedValue(mockSession);

      const result = await service.saveTranscriptRevision(mockUserId, mockSessionId, { text: 'Hello' });

      expect(result.version).toBe(1);
    });

    it('should increment version for existing revisions', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.transcriptRevision.findFirst.mockResolvedValue({ version: 3 });
      mockPrismaService.transcriptRevision.create.mockResolvedValue({
        id: 'rev-4',
        version: 4,
        content: { text: 'Updated' },
      });
      mockPrismaService.transcriptionSession.update.mockResolvedValue(mockSession);

      const result = await service.saveTranscriptRevision(mockUserId, mockSessionId, { text: 'Updated' });

      expect(result.version).toBe(4);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.saveTranscriptRevision(mockUserId, 'invalid-id', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSessionsByUser', () => {
    it('should return user sessions', async () => {
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([mockSession]);

      const result = await service.getSessionsByUser(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]._links).toBeDefined();
    });

    it('should return empty array when no sessions', async () => {
      mockPrismaService.transcriptionSession.findMany.mockResolvedValue([]);

      const result = await service.getSessionsByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getSessionById', () => {
    it('should return session with segments and chunks', async () => {
      const sessionWithData = {
        ...mockSession,
        segments: [{ id: 'seg-1', text: 'Hello', startTime: new Prisma.Decimal(0), words: [] }],
        audioChunks: [{ id: 'chunk-1', storageUrl: 'http://storage/chunk1' }],
      };
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(sessionWithData);

      const result = await service.getSessionById(mockUserId, mockSessionId);

      expect(result.id).toBe(mockSessionId);
      expect(result.segments).toHaveLength(1);
      expect(result.audioChunks).toHaveLength(1);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.getSessionById(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveTranscript', () => {
    const saveDto = {
      sessionId: mockSessionId,
      text: 'Hello world',
      startTime: 0,
      isPartial: false,
      words: [
        { word: 'Hello', startTime: 0, wordIndex: 0 },
        { word: 'world', startTime: 0.5, wordIndex: 1 },
      ],
    };

    it('should save transcript segment with words', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);
      const mockSegment = {
        id: 'seg-1',
        text: saveDto.text,
        startTime: new Prisma.Decimal(0),
        isPartial: false,
      };
      mockPrismaService.transcriptionSegment.create.mockResolvedValue(mockSegment);
      mockPrismaService.transcriptionWord.createMany.mockResolvedValue({ count: 2 });
      mockPrismaService.transcriptionSegment.findUnique.mockResolvedValue({
        ...mockSegment,
        words: saveDto.words,
      });

      const result = await service.saveTranscript(mockUserId, saveDto);

      expect(result.id).toBe('seg-1');
      expect(mockPrismaService.transcriptionWord.createMany).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.saveTranscript(mockUserId, saveDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveAudioChunk', () => {
    const chunkDto = {
      sessionId: mockSessionId,
      chunkIndex: 0,
      startTime: 0,
      endTime: 5,
      duration: 5,
      sampleRate: 44100,
      audioUrl: 'data:audio/webm;base64,SGVsbG8gV29ybGQ=',
    };

    it('should save audio chunk', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);
      mockStorageService.uploadAudioChunk.mockResolvedValue({
        url: 'http://storage/chunk',
        key: 'chunks/key',
      });
      mockPrismaService.audioChunk.create.mockResolvedValue({
        id: 'chunk-1',
        ...chunkDto,
      });
      mockPrismaService.transcriptionSession.update.mockResolvedValue(mockSession);

      const result = await service.saveAudioChunk(mockUserId, chunkDto);

      expect(result.id).toBe('chunk-1');
      expect(mockStorageService.uploadAudioChunk).toHaveBeenCalled();
    });

    it('should throw error for invalid audio URL format', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);

      await expect(service.saveAudioChunk(mockUserId, { ...chunkDto, audioUrl: 'invalid-url' })).rejects.toThrow();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.saveAudioChunk(mockUserId, chunkDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveFullAudio', () => {
    const audioUrl = 'data:audio/webm;base64,SGVsbG8gV29ybGQ=';

    it('should save full audio to note folder', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(mockSession);
      mockNotesService.getNoteStoragePath.mockResolvedValue('users/test@example.com/Note');
      mockStorageService.uploadBuffer.mockResolvedValue({
        publicUrl: 'http://storage/audio.webm',
        storageKey: 'users/test@example.com/Note/audio/Test Session.webm',
      });
      mockStorageService.getPublicUrl.mockReturnValue('http://storage/audio.webm');
      mockPrismaService.transcriptionSession.update.mockResolvedValue({
        ...mockSession,
        fullAudioUrl: 'http://storage/audio.webm',
      });

      const result = await service.saveFullAudio(mockUserId, mockSessionId, audioUrl, 60);

      expect(result.fullAudioUrl).toBeDefined();
      expect(mockStorageService.uploadBuffer).toHaveBeenCalled();
    });

    it('should fallback to user transcription folder when noteId is null', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        noteId: null,
      });
      mockStorageService.uploadFullAudio.mockResolvedValue({
        url: 'http://storage/fallback.webm',
        key: 'users/user-123/transcription/session.webm',
      });
      mockPrismaService.transcriptionSession.update.mockResolvedValue({
        ...mockSession,
        fullAudioUrl: 'http://storage/fallback.webm',
      });

      const result = await service.saveFullAudio(mockUserId, mockSessionId, audioUrl, 60);

      expect(result).toBeDefined();
      expect(mockStorageService.uploadFullAudio).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.saveFullAudio(mockUserId, 'invalid-id', audioUrl, 60)).rejects.toThrow(NotFoundException);
    });
  });

  describe('endSession', () => {
    it('should end session and update status', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        segments: [{ id: 'seg-1', text: 'Hello', words: [] }],
        fullAudioKey: 'audio/key',
      });
      mockNotesService.getNoteStoragePath.mockResolvedValue('users/test@example.com/Note');
      mockStorageService.uploadBuffer.mockResolvedValue({ publicUrl: 'url' });
      mockPrismaService.transcriptionSession.update.mockResolvedValue({
        ...mockSession,
        status: 'completed',
      });

      const result = await service.endSession(mockUserId, mockSessionId);

      expect(result.status).toBe('completed');
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.endSession(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteSession', () => {
    it('should soft delete session', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        audioChunks: [{ id: 'chunk-1', storageKey: 'key1' }],
      });
      mockStorageService.deleteFile.mockResolvedValue(undefined);
      mockPrismaService.transcriptionSession.update.mockResolvedValue({
        ...mockSession,
        deletedAt: new Date(),
      });

      const result = await service.deleteSession(mockUserId, mockSessionId);

      expect(result.success).toBe(true);
      expect(mockStorageService.deleteFile).toHaveBeenCalled();
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue(null);

      await expect(service.deleteSession(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAudioStream', () => {
    it('should return audio stream from full audio', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        fullAudioKey: 'audio/key',
        fullAudioSize: 1024,
      });
      mockStorageService.getFileStream.mockResolvedValue({
        body: Buffer.from('audio data'),
        contentType: 'audio/webm',
        contentLength: 1024,
      });

      const result = await service.getAudioStream(mockUserId, mockSessionId);

      expect(result.stream).toBeDefined();
      expect(result.contentType).toBe('audio/webm');
    });

    it('should fallback to first chunk when no full audio', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        fullAudioKey: null,
      });
      mockPrismaService.audioChunk.findFirst.mockResolvedValue({
        storageKey: 'chunks/key',
        fileSize: 512,
      });
      mockStorageService.getFileStream.mockResolvedValue({
        body: Buffer.from('chunk data'),
        contentType: 'audio/webm',
      });

      const result = await service.getAudioStream(mockUserId, mockSessionId);

      expect(result.stream).toBeDefined();
    });

    it('should throw NotFoundException when no audio available', async () => {
      mockPrismaService.transcriptionSession.findFirst.mockResolvedValue({
        ...mockSession,
        fullAudioKey: null,
      });
      mockPrismaService.audioChunk.findFirst.mockResolvedValue(null);

      await expect(service.getAudioStream(mockUserId, mockSessionId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when session not found', async () => {
      mockPrismaService.transcriptionSession.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      await expect(service.getAudioStream(mockUserId, 'invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as transcriptionApi from '@/lib/api/transcription.api';

// Mock apiClient
vi.mock('@/lib/api/client', () => ({
  apiClient: vi.fn(),
}));

describe('Transcription API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSession', () => {
    it('creates a new transcription session', async () => {
      const mockSession = {
        id: 'session1',
        userId: 'user1',
        title: 'Test Recording',
        noteId: undefined,
        duration: 0,
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const { apiClient } = await import('@/lib/api/client');
      (apiClient as any).mockResolvedValue(mockSession);

      const result = await transcriptionApi.createSession('Test Recording');

      expect(result).toEqual(mockSession);
      expect(apiClient).toHaveBeenCalledWith(
        '/api/transcription/sessions',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('saveTranscript', () => {
    it('saves a transcript segment', async () => {
      const mockSegment = {
        id: 'seg1',
        sessionId: 'session1',
        text: 'Hello world',
        startTime: 0,
        endTime: 2,
        isPartial: false,
        language: 'ko',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
      };

      const { apiClient } = await import('@/lib/api/client');
      (apiClient as any).mockResolvedValue(mockSegment);

      const result = await transcriptionApi.saveTranscript({
        sessionId: 'session1',
        text: 'Hello world',
        startTime: 0,
        endTime: 2,
        isPartial: false,
      });

      expect(result).toEqual(mockSegment);
      expect(apiClient).toHaveBeenCalledWith(
        '/api/transcription/segments',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  describe('getSession', () => {
    it('retrieves session with audio chunks and transcripts', async () => {
      const mockSessionData = {
        id: 'session1',
        userId: 'user1',
        senderDeviceId: 'device1',
        receiverDeviceId: 'device2',
        title: 'Test Recording',
        isActive: false,
        startedAt: '2025-01-01T00:00:00Z',
        endedAt: '2025-01-01T00:10:00Z',
        audioChunks: [],
        transcriptSegments: [],
      };

      const { apiClient } = await import('@/lib/api/client');
      (apiClient as any).mockResolvedValue(mockSessionData);

      const result = await transcriptionApi.getSession('session1');

      expect(result).toEqual(mockSessionData);
      expect(apiClient).toHaveBeenCalledWith(
        '/api/transcription/sessions/session1',
      );
    });
  });
});
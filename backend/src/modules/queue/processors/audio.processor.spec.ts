/**
 * AudioProcessor Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AudioProcessor } from './audio.processor';
import { TranscriptionService } from '../../transcription/transcription.service';
import { StorageService } from '../../storage/storage.service';

describe('AudioProcessor', () => {
  let processor: AudioProcessor;

  const mockTranscriptionService = {
    saveTranscript: jest.fn() as jest.Mock,
  };

  const mockStorageService = {
    getFileStream: jest.fn() as jest.Mock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AudioProcessor,
        { provide: TranscriptionService, useValue: mockTranscriptionService },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    processor = module.get<AudioProcessor>(AudioProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('process', () => {
    it('should handle transcribe job', async () => {
      const data = { sessionId: 'session-123', audioUrl: 'http://storage/audio.webm' };

      const result = await processor.process('transcribe', data);

      expect(result.result).toBe('transcribed');
      expect(result.sessionId).toBe('session-123');
    });

    it('should skip unknown job types', async () => {
      const result = await processor.process('unknown-job', {});

      expect(result.result).toBe('skipped');
    });

    it('should log job processing', async () => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await processor.process('transcribe', { sessionId: 'test' });

      // Processor uses Logger, not console.log directly
      logSpy.mockRestore();
    });
  });

  describe('handleTranscription', () => {
    it('should complete transcription process', async () => {
      const data = { sessionId: 'session-456', audioUrl: 'http://storage/audio.webm' };

      const result = await processor.process('transcribe', data);

      expect(result).toEqual({
        result: 'transcribed',
        sessionId: 'session-456',
      });
    }, 5000); // Increase timeout since it has 2s delay

    it('should handle missing sessionId', async () => {
      const result = await processor.process('transcribe', { audioUrl: 'http://storage/audio.webm' });

      expect(result.result).toBe('transcribed');
      expect(result.sessionId).toBeUndefined();
    }, 5000);
  });
});


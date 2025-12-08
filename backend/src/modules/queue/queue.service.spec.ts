/**
 * QueueService Unit Tests
 */
import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { AudioProcessor } from './processors/audio.processor';

describe('QueueService', () => {
  let service: QueueService;
  let audioProcessor: jest.Mocked<AudioProcessor>;

  const mockAudioProcessor = {
    process: jest.fn() as jest.Mock,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: AudioProcessor, useValue: mockAudioProcessor },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    audioProcessor = module.get(AudioProcessor);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addAudioJob', () => {
    it('should add audio job and return job info', async () => {
      mockAudioProcessor.process.mockResolvedValue({ result: 'success' });

      const result = await service.addAudioJob('convert', { audioId: 'audio-123' });

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('convert');
      expect(result.data).toEqual({ audioId: 'audio-123' });
    });

    it('should handle different job types', async () => {
      mockAudioProcessor.process.mockResolvedValue({ result: 'processed' });

      const result = await service.addAudioJob('transcode', { format: 'mp3' });

      expect(result.name).toBe('transcode');
      expect(mockAudioProcessor.process).toHaveBeenCalledWith('transcode', { format: 'mp3' });
    });

    it('should not wait for job completion', async () => {
      // Simulate slow job
      mockAudioProcessor.process.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ result: 'done' }), 1000)),
      );

      const startTime = Date.now();
      await service.addAudioJob('slow-job', {});
      const endTime = Date.now();

      // Should return immediately, not after 1000ms
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should handle job failure gracefully', async () => {
      mockAudioProcessor.process.mockRejectedValue(new Error('Job failed'));

      // Should not throw even if job fails
      const result = await service.addAudioJob('failing-job', {});

      expect(result).toHaveProperty('id');
    });
  });

  describe('addTranscriptionJob', () => {
    it('should add transcription job', async () => {
      mockAudioProcessor.process.mockResolvedValue({ result: 'transcribed' });

      const result = await service.addTranscriptionJob('session-123', 'http://storage/audio.webm');

      expect(result.name).toBe('transcribe');
      expect(result.data.sessionId).toBe('session-123');
      expect(result.data.audioUrl).toBe('http://storage/audio.webm');
    });

    it('should include timestamp in job data', async () => {
      mockAudioProcessor.process.mockResolvedValue({ result: 'transcribed' });
      const beforeTime = Date.now();

      const result = await service.addTranscriptionJob('session-456', 'http://storage/audio.webm');

      expect(result.data.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.data.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should call audio processor with transcribe job', async () => {
      mockAudioProcessor.process.mockResolvedValue({ result: 'transcribed' });

      await service.addTranscriptionJob('session-789', 'http://storage/audio.webm');

      expect(mockAudioProcessor.process).toHaveBeenCalledWith(
        'transcribe',
        expect.objectContaining({
          sessionId: 'session-789',
          audioUrl: 'http://storage/audio.webm',
        }),
      );
    });
  });
});

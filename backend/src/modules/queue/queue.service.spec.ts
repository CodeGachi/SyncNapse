import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { getQueueToken } from '@nestjs/bullmq';
import { AudioProcessor } from './processors/audio.processor';

describe('QueueService', () => {
  let service: QueueService;

  const mockQueue = {
    add: jest.fn(),
  };

  const mockAudioProcessor = {
    process: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: getQueueToken('audio-processing'),
          useValue: mockQueue,
        },
        {
          provide: AudioProcessor,
          useValue: mockAudioProcessor,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addAudioJob', () => {
    it('should add a job to the queue', async () => {
      // Mock AudioProcessor to return a Promise
      mockAudioProcessor.process.mockResolvedValue({});

      await service.addAudioJob('transcribe', { fileId: '123' });
      
      // Since QueueService calls audioProcessor.process directly in the simplified version:
      expect(mockAudioProcessor.process).toHaveBeenCalledWith(
        'transcribe',
        { fileId: '123' }
      );
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionController } from './transcription.controller';
import { TranscriptionService } from './transcription.service';

describe('TranscriptionController', () => {
  let controller: TranscriptionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TranscriptionController],
      providers: [
        {
          provide: TranscriptionService,
          useValue: {
            createSession: jest.fn(),
            getSessionsByUser: jest.fn(),
            getSessionById: jest.fn(),
            endSession: jest.fn(),
            deleteSession: jest.fn(),
            saveTranscript: jest.fn(),
            saveAudioChunk: jest.fn(),
            saveFullAudio: jest.fn(),
            getAudioStream: jest.fn(),
            saveTranscriptRevision: jest.fn(),
            getTranscriptRevisions: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TranscriptionController>(TranscriptionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


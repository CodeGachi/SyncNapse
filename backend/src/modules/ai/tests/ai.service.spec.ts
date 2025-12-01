import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from '../ai.service';
import { RagEngineService } from '../services/rag-engine.service';
import { ChatMode } from '../dto/chat.dto';

describe('AiService', () => {
  let service: AiService;
  let ragEngine: RagEngineService;

  beforeEach(async () => {
    const mockRagEngine = {
      queryWithRag: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: RagEngineService,
          useValue: mockRagEngine,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    ragEngine = module.get<RagEngineService>(RagEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const result = await service.healthCheck();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('geminiConfigured');
    });
  });

  describe('chat', () => {
    it('should call ragEngine.queryWithRag with correct parameters', async () => {
      const mockResponse = {
        answer: 'Test answer',
        citations: [],
      };

      (ragEngine.queryWithRag as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.chat({
        lectureNoteId: 'test-note-id',
        question: 'Test question',
        mode: ChatMode.QUESTION,
        userId: 'test-user-id',
      });

      expect(ragEngine.queryWithRag).toHaveBeenCalledWith(
        'test-note-id',
        'Test question',
        ChatMode.QUESTION
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle errors gracefully', async () => {
      (ragEngine.queryWithRag as jest.Mock).mockRejectedValue(
        new Error('Test error')
      );

      await expect(
        service.chat({
          lectureNoteId: 'test-note-id',
          question: 'Test question',
        })
      ).rejects.toThrow();
    });

    it('should use default mode if not provided', async () => {
      const mockResponse = {
        answer: 'Test answer',
        citations: [],
      };

      (ragEngine.queryWithRag as jest.Mock).mockResolvedValue(mockResponse);

      await service.chat({
        lectureNoteId: 'test-note-id',
        question: 'Test question',
      });

      expect(ragEngine.queryWithRag).toHaveBeenCalledWith(
        'test-note-id',
        'Test question',
        ChatMode.QUESTION
      );
    });
  });
});


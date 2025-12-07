import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from '../ai.controller';
import { AiService } from '../ai.service';
import { ChatMode } from '../dto/chat.dto';

describe('AiController', () => {
  let controller: AiController;
  let service: AiService;

  beforeEach(async () => {
    const mockAiService = {
      chat: jest.fn(),
      healthCheck: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        {
          provide: AiService,
          useValue: mockAiService,
        },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should call aiService.chat with correct parameters', async () => {
      const chatRequest = {
        lectureNoteId: 'test-note-id',
        question: 'Test question',
        mode: ChatMode.QUESTION,
      };

      const mockResponse = {
        answer: 'Test answer',
        citations: [],
      };

      (service.chat as jest.Mock).mockResolvedValue(mockResponse);

      const req = { user: { userId: 'test-user-id' } };
      const result = await controller.chat(chatRequest, req);

      expect(service.chat).toHaveBeenCalledWith({
        lectureNoteId: chatRequest.lectureNoteId,
        question: chatRequest.question,
        mode: chatRequest.mode,
        userId: 'test-user-id',
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle requests without authenticated user', async () => {
      const chatRequest = {
        lectureNoteId: 'test-note-id',
        question: 'Test question',
      };

      const mockResponse = {
        answer: 'Test answer',
        citations: [],
      };

      (service.chat as jest.Mock).mockResolvedValue(mockResponse);

      const req = {}; // No user
      await controller.chat(chatRequest, req);

      expect(service.chat).toHaveBeenCalledWith({
        lectureNoteId: chatRequest.lectureNoteId,
        question: chatRequest.question,
        mode: undefined,
        userId: undefined,
      });
    });
  });

  describe('health', () => {
    it('should return health check result', async () => {
      const mockHealth = {
        status: 'ok',
        geminiConfigured: true,
      };

      (service.healthCheck as jest.Mock).mockResolvedValue(mockHealth);

      const result = await controller.health();

      expect(service.healthCheck).toHaveBeenCalled();
      expect(result).toEqual(mockHealth);
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { AudioController } from './audio.controller';
import { AudioService } from './audio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('AudioController', () => {
  let controller: AudioController;

  const mockAudioService = {
    createRecording: jest.fn(),
    getRecording: jest.fn(),
    deleteRecording: jest.fn(),
    addTimelineEvent: jest.fn(),
    getTimelineEvents: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AudioController],
      providers: [
        { provide: AudioService, useValue: mockAudioService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<AudioController>(AudioController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRecording', () => {
    it('should call service.createRecording', async () => {
      const dto = { noteId: 'note-1' } as any;
      const file = {} as any;
      // Use proper mock user from decorator behavior simulation
      await controller.createRecording('user-1' as any, dto, file);
      expect(mockAudioService.createRecording).toHaveBeenCalledWith('user-1', dto, file);
    });
  });
});

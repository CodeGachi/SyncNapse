import { Test, TestingModule } from '@nestjs/testing';
import { NotesController } from './notes.controller';
import { NotesService } from './notes.service';
import { SavePageTypingDto } from './dto/save-page-typing.dto';

describe('NotesController', () => {
  let controller: NotesController;
  let service: any;

  const mockNotesService = {
    savePageTyping: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotesController],
      providers: [
        { provide: NotesService, useValue: mockNotesService },
      ],
    }).compile();

    controller = module.get<NotesController>(NotesController);
    service = module.get<NotesService>(NotesService);
  });

  describe('savePageTyping', () => {
    it('should call service with version from dto', async () => {
      const dto: SavePageTypingDto = {
        content: { delta: 'test' },
        version: 1,
      };
      
      await controller.savePageTyping('user-1', 'note-1', 'file-1', '1', dto);

      expect(mockNotesService.savePageTyping).toHaveBeenCalledWith(
        'user-1',
        'note-1',
        'file-1',
        1,
        dto.content,
        1
      );
    });
  });
});

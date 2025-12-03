import { Test, TestingModule } from '@nestjs/testing';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('FilesController', () => {
  let controller: FilesController;

  const mockFilesService = {
    createFile: jest.fn(),
    getFile: jest.fn(),
    updateFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FilesController],
      providers: [
        { provide: FilesService, useValue: mockFilesService },
      ],
    })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .compile();

    controller = module.get<FilesController>(FilesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createFile', () => {
    it('should call service.createFile', async () => {
      const dto = { noteId: 'note-1', fileType: 'application/pdf', fileSize: 100 } as any;
      const file = { originalname: 'test.pdf' } as Express.Multer.File;
      
      await controller.createFile('user-1', dto, file);
      
      expect(mockFilesService.createFile).toHaveBeenCalledWith('user-1', dto, file);
    });
  });
});

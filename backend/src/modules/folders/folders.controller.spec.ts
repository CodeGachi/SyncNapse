import { Test, TestingModule } from '@nestjs/testing';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';

describe('FoldersController', () => {
  let controller: FoldersController;

  const mockFoldersService = {
    getFoldersByUser: jest.fn(),
    createFolder: jest.fn(),
    updateFolder: jest.fn(),
    deleteFolder: jest.fn(),
    moveFolder: jest.fn(),
    getFolderPath: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FoldersController],
      providers: [
        { provide: FoldersService, useValue: mockFoldersService },
      ],
    }).compile();

    controller = module.get<FoldersController>(FoldersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { StorageTestController } from './storage-test.controller';
import { StorageService } from './storage.service';

describe('StorageTestController', () => {
  let controller: StorageTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageTestController],
      providers: [
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn(),
            uploadBuffer: jest.fn(),
            downloadFile: jest.fn(),
            deleteFile: jest.fn(),
            getPublicUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<StorageTestController>(StorageTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


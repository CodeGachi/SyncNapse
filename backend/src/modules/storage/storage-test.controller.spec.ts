import { Test, TestingModule } from '@nestjs/testing';

/**
 * StorageTestController Unit Tests
 */
describe('StorageTestController', () => {
  let controller: any;
  let mockStorageService: any;

  beforeEach(async () => {
    mockStorageService = {
      uploadFile: jest.fn().mockResolvedValue({ publicUrl: 'http://storage/file', storageKey: 'key' }),
      uploadBuffer: jest.fn().mockResolvedValue({ publicUrl: 'http://storage/buffer', storageKey: 'buffer-key' }),
      downloadFile: jest.fn().mockResolvedValue(Buffer.from('file content')),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest.fn().mockImplementation((key: string) => `http://storage/${key}`),
    };

    // Dynamic import
    const { StorageTestController } = await import('./storage-test.controller');
    const { StorageService } = await import('./storage.service');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [StorageTestController],
      providers: [
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    controller = module.get(StorageTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

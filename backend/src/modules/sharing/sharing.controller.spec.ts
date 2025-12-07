import { Test, TestingModule } from '@nestjs/testing';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

describe('SharingController', () => {
  let controller: SharingController;
  const mockSharingService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharingController],
      providers: [
        { provide: SharingService, useValue: mockSharingService },
      ],
    }).compile();

    controller = module.get<SharingController>(SharingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

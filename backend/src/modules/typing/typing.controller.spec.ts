import { Test, TestingModule } from '@nestjs/testing';
import { TypingController } from './typing.controller';
import { TypingService } from './typing.service';

describe('TypingController', () => {
  let controller: TypingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TypingController],
      providers: [
        {
          provide: TypingService,
          useValue: {
            getPageContent: jest.fn(),
            savePageContent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TypingController>(TypingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RootController } from './root.controller';
import { LinkBuilderService } from './hypermedia/link-builder.service';

describe('RootController', () => {
  let controller: RootController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RootController],
      providers: [
        {
          provide: LinkBuilderService,
          useValue: {
            self: jest.fn(),
            action: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<RootController>(RootController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});


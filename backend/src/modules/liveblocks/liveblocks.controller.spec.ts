import { Test, TestingModule } from '@nestjs/testing';
import { LiveblocksController } from './liveblocks.controller';
import { LiveblocksService } from './liveblocks.service';
import { PrismaService } from '../db/prisma.service';

describe('LiveblocksController', () => {
  let controller: LiveblocksController;
  const mockLiveblocksService = {
    authorize: jest.fn(),
  };
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveblocksController],
      providers: [
        { provide: LiveblocksService, useValue: mockLiveblocksService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<LiveblocksController>(LiveblocksController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

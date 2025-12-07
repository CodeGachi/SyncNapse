import { Test, TestingModule } from '@nestjs/testing';
import { LiveblocksService } from './liveblocks.service';
import { PrismaService } from '../db/prisma.service';

describe('LiveblocksService', () => {
  let service: LiveblocksService;
  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LiveblocksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LiveblocksService>(LiveblocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

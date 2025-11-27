import { Test, TestingModule } from '@nestjs/testing';
import { SharingService } from './sharing.service';
import { PrismaService } from '../db/prisma.service';

describe('SharingService', () => {
  let service: SharingService;
  const mockPrismaService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SharingService>(SharingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

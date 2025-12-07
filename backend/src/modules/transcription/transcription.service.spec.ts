import { Test, TestingModule } from '@nestjs/testing';
import { TranscriptionService } from './transcription.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TranscriptionService,
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: StorageService,
          useValue: {},
        },
        {
          provide: NotesService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TranscriptionService>(TranscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});


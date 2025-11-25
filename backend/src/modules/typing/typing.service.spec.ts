import { Test, TestingModule } from '@nestjs/testing';
import { TypingService } from './typing.service';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { NotesService } from '../notes/notes.service';
import { LoggingService } from '../logging/logging.service';

describe('TypingService', () => {
  let service: TypingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TypingService,
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
        {
          provide: LoggingService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<TypingService>(TypingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});


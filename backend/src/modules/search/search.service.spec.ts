import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../db/prisma.service';
import { Prisma } from '@prisma/client';

describe('SearchService', () => {
  let service: SearchService;
  let mockPrismaService: any;

  const mockNotes = [
    {
      id: 'note-1',
      title: 'JavaScript Basics',
      updatedAt: new Date('2024-01-15'),
    },
    {
      id: 'note-2',
      title: 'Advanced JavaScript',
      updatedAt: new Date('2024-01-20'),
    },
  ];

  const mockFiles = [
    {
      id: 'file-1',
      fileName: 'javascript-guide.pdf',
      noteId: 'note-1',
      uploadedAt: new Date('2024-01-10'),
      note: { id: 'note-1', title: 'JavaScript Basics' },
    },
  ];

  const mockSegments = [
    {
      id: 'segment-1',
      text: 'JavaScript is a programming language',
      startTime: new Prisma.Decimal(10.5),
      endTime: new Prisma.Decimal(15.0),
      confidence: new Prisma.Decimal(0.95),
      sessionId: 'session-1',
      createdAt: new Date('2024-01-12'),
      session: {
        id: 'session-1',
        title: 'Lecture 1',
        noteId: 'note-1',
        note: { title: 'JavaScript Basics' },
      },
    },
  ];

  beforeEach(async () => {
    mockPrismaService = {
      lectureNote: {
        findMany: jest.fn(),
      },
      file: {
        findMany: jest.fn(),
      },
      transcriptionSegment: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchAll', () => {
    it('should return empty results for empty query', async () => {
      const result = await service.searchAll('user-123', { q: '' });

      expect(result).toEqual({ notes: [], files: [], segments: [] });
      expect(mockPrismaService.lectureNote.findMany).not.toHaveBeenCalled();
    });

    it('should return empty results for whitespace-only query', async () => {
      const result = await service.searchAll('user-123', { q: '   ' });

      expect(result).toEqual({ notes: [], files: [], segments: [] });
    });

    it('should search notes, files, and segments in parallel', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue(mockNotes);
      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue(mockSegments);

      const result = await service.searchAll('user-123', { q: 'JavaScript' });

      expect(result.notes).toHaveLength(2);
      expect(result.files).toHaveLength(1);
      expect(result.segments).toHaveLength(1);

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalled();
      expect(mockPrismaService.file.findMany).toHaveBeenCalled();
      expect(mockPrismaService.transcriptionSegment.findMany).toHaveBeenCalled();
    });

    it('should format note results correctly', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue(mockNotes);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      const result = await service.searchAll('user-123', { q: 'JavaScript' });

      expect(result.notes[0]).toEqual({
        id: 'note-1',
        type: 'note',
        title: 'JavaScript Basics',
        updatedAt: mockNotes[0].updatedAt,
      });
    });

    it('should format file results correctly', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue(mockFiles);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      const result = await service.searchAll('user-123', { q: 'javascript' });

      expect(result.files[0]).toEqual({
        id: 'file-1',
        type: 'file',
        title: 'javascript-guide.pdf',
        noteTitle: 'JavaScript Basics',
        noteId: 'note-1',
        updatedAt: mockFiles[0].uploadedAt,
      });
    });

    it('should format segment results correctly', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue(mockSegments);

      const result = await service.searchAll('user-123', { q: 'programming' });

      expect(result.segments[0]).toEqual({
        id: 'segment-1',
        type: 'segment',
        text: 'JavaScript is a programming language',
        startTime: 10.5,
        endTime: 15.0,
        sessionId: 'session-1',
        sessionTitle: 'Lecture 1',
        noteId: 'note-1',
        noteTitle: 'JavaScript Basics',
        confidence: 0.95,
      });
    });

    it('should respect limit parameter', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'test', limit: 10 });

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
      expect(mockPrismaService.transcriptionSegment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 })
      );
    });

    it('should use default limit of 20', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'test' });

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 })
      );
    });

    it('should search with case-insensitive matching', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'JAVASCRIPT' });

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: 'JAVASCRIPT', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should only search notes belonging to the user', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'test' });

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            foldersLink: {
              some: {
                folder: { userId: 'user-123', deletedAt: null },
              },
            },
            deletedAt: null,
          }),
        })
      );
    });

    it('should only search latest file versions', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'test' });

      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isLatest: true,
            deletedAt: null,
          }),
        })
      );
    });

    it('should handle segment without note title', async () => {
      const segmentWithoutNote = {
        ...mockSegments[0],
        session: {
          ...mockSegments[0].session,
          note: null,
        },
      };
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([segmentWithoutNote]);

      const result = await service.searchAll('user-123', { q: 'programming' });

      expect(result.segments[0].noteTitle).toBeUndefined();
    });

    it('should order results by most recent first', async () => {
      mockPrismaService.lectureNote.findMany.mockResolvedValue([]);
      mockPrismaService.file.findMany.mockResolvedValue([]);
      mockPrismaService.transcriptionSegment.findMany.mockResolvedValue([]);

      await service.searchAll('user-123', { q: 'test' });

      expect(mockPrismaService.lectureNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { updatedAt: 'desc' },
        })
      );
      expect(mockPrismaService.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { uploadedAt: 'desc' },
        })
      );
      expect(mockPrismaService.transcriptionSegment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        })
      );
    });
  });
});

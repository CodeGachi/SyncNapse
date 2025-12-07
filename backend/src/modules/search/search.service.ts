import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async searchAll(userId: string, query: SearchQueryDto) {
    const { q, limit = 20 } = query;
    this.logger.debug(`[searchAll] userId=${userId} q=${q}`);

    if (!q || q.trim().length === 0) {
      return { notes: [], files: [], segments: [] };
    }

    // Parallel search
    const [notes, files, segments] = await Promise.all([
      // 1. Search Notes (Title)
      this.prisma.lectureNote.findMany({
        where: {
          title: { contains: q, mode: 'insensitive' },
          foldersLink: {
            some: {
              folder: { userId, deletedAt: null },
            },
          },
          deletedAt: null,
        },
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),

      // 2. Search Files (Name)
      this.prisma.file.findMany({
        where: {
          fileName: { contains: q, mode: 'insensitive' },
          note: {
            foldersLink: {
              some: {
                folder: { userId, deletedAt: null },
              },
            },
            deletedAt: null,
          },
          deletedAt: null,
          isLatest: true,
        },
        take: limit,
        orderBy: { uploadedAt: 'desc' },
        include: { note: { select: { id: true, title: true } } },
      }),

      // 3. Search Transcription Segments (Text) - The most important part
      this.prisma.transcriptionSegment.findMany({
        where: {
          text: { contains: q, mode: 'insensitive' },
          session: {
            userId,
            deletedAt: null,
          },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          session: {
            select: {
              id: true,
              title: true,
              noteId: true,
              note: { select: { title: true } },
            },
          },
        },
      }),
    ]);

    return {
      notes: notes.map(n => ({
        id: n.id,
        type: 'note',
        title: n.title,
        updatedAt: n.updatedAt,
      })),
      files: files.map(f => ({
        id: f.id,
        type: 'file',
        title: f.fileName,
        noteTitle: f.note.title,
        noteId: f.noteId,
        updatedAt: f.uploadedAt,
      })),
      segments: segments.map(s => ({
        id: s.id,
        type: 'segment',
        text: s.text,
        startTime: Number(s.startTime),
        endTime: Number(s.endTime),
        sessionId: s.sessionId,
        sessionTitle: s.session.title,
        noteId: s.session.noteId,
        noteTitle: s.session.note?.title,
        confidence: Number(s.confidence),
      })),
    };
  }
}


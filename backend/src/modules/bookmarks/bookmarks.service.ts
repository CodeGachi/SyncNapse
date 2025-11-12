import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookmarksService {
  private readonly logger = new Logger(BookmarksService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convert Prisma Decimal to number for API responses
   */
  private decimalToNumber(decimal: Prisma.Decimal | null | undefined): number | null {
    if (decimal === null || decimal === undefined) return null;
    return Number(decimal.toString());
  }

  /**
   * Transform bookmark for API response (Decimal -> number)
   */
  private transformBookmark(bookmark: {
    id: string;
    noteId: string;
    userId: string;
    startSec: Prisma.Decimal;
    tag: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: bookmark.id,
      noteId: bookmark.noteId,
      userId: bookmark.userId,
      startSec: this.decimalToNumber(bookmark.startSec)!,
      tag: bookmark.tag,
      comment: bookmark.comment,
      createdAt: bookmark.createdAt,
      updatedAt: bookmark.updatedAt,
    };
  }

  /**
   * Find all bookmarks for a note (filtered by userId)
   */
  async findAllForNote(noteId: string, userId: string) {
    this.logger.debug(`findAllForNote noteId=${noteId} userId=${userId}`);

    const bookmarks = await this.prisma.bookmark.findMany({
      where: { noteId, userId },
      orderBy: { startSec: 'asc' },
    });

    return bookmarks.map((b) => this.transformBookmark(b));
  }

  /**
   * Create a new bookmark for a note
   */
  async createForNote(noteId: string, userId: string, dto: CreateBookmarkDto) {
    this.logger.debug(`createForNote noteId=${noteId} userId=${userId} startSec=${dto.startSec}`);

    if (dto.startSec < 0) {
      throw new BadRequestException('startSec must be greater than or equal to 0');
    }

    try {
      const bookmark = await this.prisma.bookmark.create({
        data: {
          noteId,
          userId,
          startSec: new Prisma.Decimal(dto.startSec),
          tag: dto.tag ?? null,
          comment: dto.comment ?? null,
        },
      });

      return this.transformBookmark(bookmark);
    } catch (error) {
      // Handle unique constraint violation (P2002)
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Bookmark already exists at startSec ${dto.startSec} for this note`,
        );
      }
      throw error;
    }
  }

  /**
   * Find one bookmark by ID (with ownership check)
   */
  async findOne(bookmarkId: string, userId: string) {
    this.logger.debug(`findOne bookmarkId=${bookmarkId} userId=${userId}`);

    const bookmark = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!bookmark) {
      throw new NotFoundException(`Bookmark with ID ${bookmarkId} not found`);
    }

    return this.transformBookmark(bookmark);
  }

  /**
   * Update a bookmark (with ownership check)
   */
  async update(bookmarkId: string, userId: string, dto: UpdateBookmarkDto) {
    this.logger.debug(`update bookmarkId=${bookmarkId} userId=${userId}`);

    // Check if bookmark exists and belongs to user
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Bookmark with ID ${bookmarkId} not found`);
    }

    // Validate startSec if provided
    if (dto.startSec !== undefined && dto.startSec < 0) {
      throw new BadRequestException('startSec must be greater than or equal to 0');
    }

    try {
      const updated = await this.prisma.bookmark.update({
        where: { id: bookmarkId },
        data: {
          ...(dto.startSec !== undefined && { startSec: new Prisma.Decimal(dto.startSec) }),
          ...(dto.tag !== undefined && { tag: dto.tag }),
          ...(dto.comment !== undefined && { comment: dto.comment }),
        },
      });

      return this.transformBookmark(updated);
    } catch (error) {
      // Handle unique constraint violation when updating startSec
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException(
          `Bookmark already exists at startSec ${dto.startSec} for this note`,
        );
      }
      throw error;
    }
  }

  /**
   * Remove a bookmark (with ownership check)
   */
  async remove(bookmarkId: string, userId: string): Promise<void> {
    this.logger.debug(`remove bookmarkId=${bookmarkId} userId=${userId}`);

    // Check if bookmark exists and belongs to user
    const existing = await this.prisma.bookmark.findFirst({
      where: { id: bookmarkId, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Bookmark with ID ${bookmarkId} not found`);
    }

    await this.prisma.bookmark.delete({
      where: { id: bookmarkId },
    });
  }
}


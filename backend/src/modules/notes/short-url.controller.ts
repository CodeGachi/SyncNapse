/**
 * Short URL Controller
 * Handles resolution of short URLs to full note IDs
 */

import { Controller, Get, Param, NotFoundException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../db/prisma.service';

@ApiTags('short-urls')
@Controller('short-urls')
export class ShortUrlController {
  private readonly logger = new Logger(ShortUrlController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get(':shortCode')
  @ApiOperation({ summary: 'Resolve short URL to note ID' })
  @ApiParam({ name: 'shortCode', description: 'Short code (first 8 chars of note ID)' })
  async resolveShortUrl(@Param('shortCode') shortCode: string) {
    this.logger.debug(`[resolveShortUrl] Resolving short code: ${shortCode}`);

    if (!shortCode || shortCode.length < 6) {
      throw new NotFoundException('Invalid short code');
    }

    // Search for notes with ID starting with the short code
    const note = await this.prisma.lectureNote.findFirst({
      where: {
        id: { startsWith: shortCode },
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        publicAccess: true,
      },
    });

    if (!note) {
      this.logger.warn(`[resolveShortUrl] No note found for short code: ${shortCode}`);
      throw new NotFoundException('Note not found');
    }

    // Only return if note is publicly accessible or shared
    if (note.publicAccess === 'PRIVATE') {
      this.logger.warn(`[resolveShortUrl] Note is private: ${note.id}`);
      throw new NotFoundException('Note not found or not shared');
    }

    this.logger.log(`[resolveShortUrl] ✅ Resolved ${shortCode} -> ${note.id}`);

    return {
      noteId: note.id,
      title: note.title,
      publicAccess: note.publicAccess,
      _links: {
        shared: { href: `/shared/${note.id}` },
      },
    };
  }
}


import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BookmarksService } from './bookmarks.service';
import { CreateBookmarkDto, UpdateBookmarkDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

@ApiTags('bookmarks')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BookmarksController {
  private readonly logger = new Logger(BookmarksController.name);

  constructor(
    private readonly bookmarksService: BookmarksService,
    private readonly hal: HalService,
    private readonly links: LinkBuilderService,
  ) {}

  /**
   * Build HAL resource for a single bookmark
   */
  private buildBookmarkResource(bookmark: {
    id: string;
    noteId: string;
    userId: string;
    startSec: number;
    tag: string | null;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return this.hal.resource(bookmark, {
      self: this.links.self(`/api/bookmarks/${bookmark.id}`),
      note: { href: `/api/notes/${bookmark.noteId}` },
      user: { href: `/api/users/${bookmark.userId}` },
      collection: { href: `/api/notes/${bookmark.noteId}/bookmarks` },
    });
  }

  /**
   * GET /notes/:noteId/bookmarks
   * List all bookmarks for a note (filtered by current user)
   */
  @Get('notes/:noteId/bookmarks')
  @ApiOperation({ summary: 'List all bookmarks for a note' })
  @ApiParam({ name: 'noteId', description: 'Lecture note ID' })
  @ApiOkResponse({ description: 'Bookmarks collection (HAL)', schema: { type: 'object' } })
  async findAllForNote(@Param('noteId') noteId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`findAllForNote noteId=${noteId} userId=${user.id}`);

    const bookmarks = await this.bookmarksService.findAllForNote(noteId, user.id);

    // Build HAL collection
    return this.hal.collection(bookmarks, {
      selfHref: `/api/notes/${noteId}/bookmarks`,
      itemSelfHref: (item) => `/api/bookmarks/${item.id}`,
      extraLinks: {
        note: { href: `/api/notes/${noteId}` },
      },
    });
  }

  /**
   * POST /notes/:noteId/bookmarks
   * Create a new bookmark for a note
   */
  @Post('notes/:noteId/bookmarks')
  @ApiOperation({ summary: 'Create a new bookmark' })
  @ApiParam({ name: 'noteId', description: 'Lecture note ID' })
  @ApiCreatedResponse({ description: 'Bookmark created (HAL)', schema: { type: 'object' } })
  async createForNote(
    @Param('noteId') noteId: string,
    @Body() dto: CreateBookmarkDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`createForNote noteId=${noteId} userId=${user.id}`);

    const bookmark = await this.bookmarksService.createForNote(noteId, user.id, dto);

    return this.buildBookmarkResource(bookmark);
  }

  /**
   * GET /bookmarks/:bookmarkId
   * Get a single bookmark by ID
   */
  @Get('bookmarks/:bookmarkId')
  @ApiOperation({ summary: 'Get a bookmark by ID' })
  @ApiParam({ name: 'bookmarkId', description: 'Bookmark ID' })
  @ApiOkResponse({ description: 'Bookmark resource (HAL)', schema: { type: 'object' } })
  async findOne(@Param('bookmarkId') bookmarkId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`findOne bookmarkId=${bookmarkId} userId=${user.id}`);

    const bookmark = await this.bookmarksService.findOne(bookmarkId, user.id);

    return this.buildBookmarkResource(bookmark);
  }

  /**
   * PATCH /bookmarks/:bookmarkId
   * Update a bookmark
   */
  @Patch('bookmarks/:bookmarkId')
  @ApiOperation({ summary: 'Update a bookmark' })
  @ApiParam({ name: 'bookmarkId', description: 'Bookmark ID' })
  @ApiOkResponse({ description: 'Updated bookmark (HAL)', schema: { type: 'object' } })
  async update(
    @Param('bookmarkId') bookmarkId: string,
    @Body() dto: UpdateBookmarkDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`update bookmarkId=${bookmarkId} userId=${user.id}`);

    const bookmark = await this.bookmarksService.update(bookmarkId, user.id, dto);

    return this.buildBookmarkResource(bookmark);
  }

  /**
   * DELETE /bookmarks/:bookmarkId
   * Delete a bookmark
   */
  @Delete('bookmarks/:bookmarkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a bookmark' })
  @ApiParam({ name: 'bookmarkId', description: 'Bookmark ID' })
  @ApiNoContentResponse({ description: 'Bookmark deleted' })
  async remove(@Param('bookmarkId') bookmarkId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`remove bookmarkId=${bookmarkId} userId=${user.id}`);

    await this.bookmarksService.remove(bookmarkId, user.id);
  }
}


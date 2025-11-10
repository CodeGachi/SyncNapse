import {
  Controller,
  Get,
  Post,
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
import { LiveSessionsService } from './live-sessions.service';
import {
  CreateLiveSessionDto,
  CreateInviteDto,
  JoinSessionDto,
  CreateSharedNoteDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

@ApiTags('live-sessions')
@Controller()
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LiveSessionsController {
  private readonly logger = new Logger(LiveSessionsController.name);

  constructor(
    private readonly sessionsService: LiveSessionsService,
    private readonly hal: HalService,
    private readonly links: LinkBuilderService,
  ) {}

  /**
   * Build HAL resource for a session
   */
  private buildSessionResource(session: any) {
    return this.hal.resource(
      {
        ...session,
        startSec: session.startSec ? Number(session.startSec) : null,
        endSec: session.endSec ? Number(session.endSec) : null,
      },
      {
        self: this.links.self(`/api/live-sessions/${session.id}`),
        note: { href: `/api/notes/${session.noteId}` },
        presenter: { href: `/api/users/${session.presenterId}` },
        members: { href: `/api/live-sessions/${session.id}/members` },
        invites: { href: `/api/live-sessions/${session.id}/invites` },
        sharedNotes: { href: `/api/live-sessions/${session.id}/shared-notes` },
      },
    );
  }

  /**
   * Build HAL resource for a shared note
   */
  private buildSharedNoteResource(sync: any) {
    return this.hal.resource(
      {
        ...sync,
        startSec: sync.startSec ? Number(sync.startSec) : null,
        endSec: sync.endSec ? Number(sync.endSec) : null,
      },
      {
        self: this.links.self(`/api/live-sessions/${sync.sessionId}/shared-notes/${sync.noteId}`),
        note: { href: `/api/notes/${sync.noteId}` },
        session: { href: `/api/live-sessions/${sync.sessionId}` },
      },
    );
  }

  /**
   * POST /live-sessions
   * Create a new live session
   */
  @Post('live-sessions')
  @ApiOperation({ summary: 'Create a new live session' })
  @ApiCreatedResponse({ description: 'Live session created (HAL)', schema: { type: 'object' } })
  async create(@Body() dto: CreateLiveSessionDto, @CurrentUser() user: { id: string }) {
    this.logger.debug(`create userId=${user.id} noteId=${dto.noteId}`);

    const session = await this.sessionsService.create(user.id, dto);

    return this.buildSessionResource(session);
  }

  /**
   * GET /live-sessions
   * List all active sessions for the current user
   */
  @Get('live-sessions')
  @ApiOperation({ summary: 'List all active sessions for current user' })
  @ApiOkResponse({ description: 'Sessions collection (HAL)', schema: { type: 'object' } })
  async findAll(@CurrentUser() user: { id: string }) {
    this.logger.debug(`findAll userId=${user.id}`);

    const sessions = await this.sessionsService.findAllForUser(user.id);

    return this.hal.collection(sessions, {
      selfHref: '/api/live-sessions',
      itemSelfHref: (item) => `/api/live-sessions/${item.id}`,
    });
  }

  /**
   * GET /live-sessions/:sessionId
   * Get a single session by ID
   */
  @Get('live-sessions/:sessionId')
  @ApiOperation({ summary: 'Get a session by ID' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiOkResponse({ description: 'Session resource (HAL)', schema: { type: 'object' } })
  async findOne(@Param('sessionId') sessionId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`findOne sessionId=${sessionId} userId=${user.id}`);

    const session = await this.sessionsService.findOne(sessionId, user.id);

    return this.buildSessionResource(session);
  }

  /**
   * POST /live-sessions/:sessionId/end
   * End a session
   */
  @Post('live-sessions/:sessionId/end')
  @ApiOperation({ summary: 'End a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiOkResponse({ description: 'Session ended (HAL)', schema: { type: 'object' } })
  async endSession(@Param('sessionId') sessionId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`endSession sessionId=${sessionId} userId=${user.id}`);

    const session = await this.sessionsService.endSession(sessionId, user.id);

    return this.buildSessionResource(session);
  }

  /**
   * POST /live-sessions/:sessionId/invites
   * Create an invite token for a session
   */
  @Post('live-sessions/:sessionId/invites')
  @ApiOperation({ summary: 'Create an invite token' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Invite created (HAL)', schema: { type: 'object' } })
  async createInvite(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateInviteDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`createInvite sessionId=${sessionId} userId=${user.id}`);

    const invite = await this.sessionsService.createInvite(sessionId, user.id, dto);

    return this.hal.resource(invite, {
      self: this.links.self(`/api/live-sessions/${sessionId}/invites/${invite.id}`),
      session: { href: `/api/live-sessions/${sessionId}` },
      join: { href: `/api/invites/${invite.token}/join` },
    });
  }

  /**
   * POST /invites/:token/join
   * Join a session using an invite token
   */
  @Post('invites/:token/join')
  @ApiOperation({ summary: 'Join a session using an invite token' })
  @ApiParam({ name: 'token', description: 'Invite token' })
  @ApiOkResponse({ description: 'Session joined (HAL)', schema: { type: 'object' } })
  async joinSession(
    @Param('token') token: string,
    @Body() dto: JoinSessionDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`joinSession token=${token} userId=${user.id}`);

    const session = await this.sessionsService.joinSession(token, user.id, dto);

    return this.buildSessionResource(session);
  }

  /**
   * POST /live-sessions/:sessionId/leave
   * Leave a session
   */
  @Post('live-sessions/:sessionId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiNoContentResponse({ description: 'Left session' })
  async leaveSession(@Param('sessionId') sessionId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`leaveSession sessionId=${sessionId} userId=${user.id}`);

    await this.sessionsService.leaveSession(sessionId, user.id);
  }

  /**
   * GET /live-sessions/:sessionId/members
   * Get all members of a session
   */
  @Get('live-sessions/:sessionId/members')
  @ApiOperation({ summary: 'Get all members of a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiOkResponse({ description: 'Members collection (HAL)', schema: { type: 'object' } })
  async getMembers(@Param('sessionId') sessionId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`getMembers sessionId=${sessionId} userId=${user.id}`);

    const members = await this.sessionsService.getMembers(sessionId, user.id);

    return this.hal.collection(members, {
      selfHref: `/api/live-sessions/${sessionId}/members`,
      itemSelfHref: (item) => `/api/live-sessions/${sessionId}/members/${item.id}`,
      extraLinks: {
        session: { href: `/api/live-sessions/${sessionId}` },
      },
    });
  }

  /**
   * GET /live-sessions/:sessionId/shared-notes
   * Get all shared notes in a session
   */
  @Get('live-sessions/:sessionId/shared-notes')
  @ApiOperation({ summary: 'Get all shared notes in a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiOkResponse({ description: 'Shared notes collection (HAL)', schema: { type: 'object' } })
  async getSharedNotes(@Param('sessionId') sessionId: string, @CurrentUser() user: { id: string }) {
    this.logger.debug(`getSharedNotes sessionId=${sessionId} userId=${user.id}`);

    const syncs = await this.sessionsService.getSharedNotes(sessionId, user.id);

    return this.hal.collection(syncs, {
      selfHref: `/api/live-sessions/${sessionId}/shared-notes`,
      itemSelfHref: (item) => `/api/live-sessions/${sessionId}/shared-notes/${item.noteId}`,
      extraLinks: {
        session: { href: `/api/live-sessions/${sessionId}` },
      },
    });
  }

  /**
   * POST /live-sessions/:sessionId/shared-notes
   * Add a shared note to a session
   */
  @Post('live-sessions/:sessionId/shared-notes')
  @ApiOperation({ summary: 'Add a shared note to a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Shared note added (HAL)', schema: { type: 'object' } })
  async addSharedNote(
    @Param('sessionId') sessionId: string,
    @Body() dto: CreateSharedNoteDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`addSharedNote sessionId=${sessionId} userId=${user.id} noteId=${dto.noteId}`);

    const sync = await this.sessionsService.addSharedNote(sessionId, user.id, dto);

    return this.buildSharedNoteResource(sync);
  }

  /**
   * DELETE /live-sessions/:sessionId/shared-notes/:noteId
   * Remove a shared note from a session
   */
  @Delete('live-sessions/:sessionId/shared-notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a shared note from a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiParam({ name: 'noteId', description: 'Note ID' })
  @ApiNoContentResponse({ description: 'Shared note removed' })
  async removeSharedNote(
    @Param('sessionId') sessionId: string,
    @Param('noteId') noteId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(
      `removeSharedNote sessionId=${sessionId} noteId=${noteId} userId=${user.id}`,
    );

    await this.sessionsService.removeSharedNote(sessionId, noteId, user.id);
  }
}


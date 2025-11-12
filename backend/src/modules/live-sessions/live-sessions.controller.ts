import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
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
  CreateTypingSectionDto,
  UpdateTypingSectionDto,
  FinalizeSessionDto,
} from './dto';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';  // 테스트용 임시 비활성화
import { CurrentUser } from '../common/current-user.decorator';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

@ApiTags('live-sessions')
@Controller()
// @UseGuards(JwtAuthGuard)  // 테스트용 임시 비활성화
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
  private buildSessionResource(session: Record<string, unknown>) {
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
  private buildSharedNoteResource(sync: Record<string, unknown>) {
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

  /**
   * POST /typing-sections
   * Create a typing section for a student in a session
   */
  @Post('typing-sections')
  @ApiOperation({ summary: 'Create a typing section for a student in a session' })
  @ApiCreatedResponse({ description: 'Typing section created (HAL)', schema: { type: 'object' } })
  async createTypingSection(
    @Body() dto: CreateTypingSectionDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`createTypingSection userId=${user.id} sessionId=${dto.sessionId}`);

    const typingSection = await this.sessionsService.createTypingSection(user.id, dto);

    return this.hal.resource(typingSection, {
      self: this.links.self(`/api/typing-sections/${typingSection.id}`),
      session: { href: `/api/live-sessions/${dto.sessionId}` },
      note: { href: `/api/notes/${dto.noteId}` },
      user: { href: `/api/users/${user.id}` },
    });
  }

  /**
   * PUT /typing-sections/:typingSectionId
   * Update a typing section
   */
  @Put('typing-sections/:typingSectionId')
  @ApiOperation({ summary: 'Update a typing section' })
  @ApiParam({ name: 'typingSectionId', description: 'Typing Section ID' })
  @ApiOkResponse({ description: 'Typing section updated (HAL)', schema: { type: 'object' } })
  async updateTypingSection(
    @Param('typingSectionId') typingSectionId: string,
    @Body() dto: UpdateTypingSectionDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`updateTypingSection id=${typingSectionId} userId=${user.id}`);

    const typingSection = await this.sessionsService.updateTypingSection(
      typingSectionId,
      user.id,
      dto,
    );

    return this.hal.resource(typingSection, {
      self: this.links.self(`/api/typing-sections/${typingSection.id}`),
      ...(typingSection.sessionId && {
        session: { href: `/api/live-sessions/${typingSection.sessionId}` },
      }),
      note: { href: `/api/notes/${typingSection.noteId}` },
      user: { href: `/api/users/${user.id}` },
    });
  }

  /**
   * DELETE /typing-sections/:typingSectionId
   * Delete a typing section
   */
  @Delete('typing-sections/:typingSectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a typing section' })
  @ApiParam({ name: 'typingSectionId', description: 'Typing Section ID' })
  @ApiNoContentResponse({ description: 'Typing section deleted' })
  async deleteTypingSection(
    @Param('typingSectionId') typingSectionId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`deleteTypingSection id=${typingSectionId} userId=${user.id}`);

    await this.sessionsService.deleteTypingSection(typingSectionId, user.id);
  }

  /**
   * GET /live-sessions/:sessionId/typing-sections
   * Get all typing sections for a user in a session
   */
  @Get('live-sessions/:sessionId/typing-sections')
  @ApiOperation({ summary: 'Get all typing sections for current user in a session' })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiOkResponse({ description: 'Typing sections collection (HAL)', schema: { type: 'object' } })
  async getTypingSections(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`getTypingSections sessionId=${sessionId} userId=${user.id}`);

    const typingSections = await this.sessionsService.getTypingSections(sessionId, user.id);

    return this.hal.collection(typingSections, {
      selfHref: `/api/live-sessions/${sessionId}/typing-sections`,
      itemSelfHref: (item) => `/api/typing-sections/${item.id}`,
      extraLinks: {
        session: { href: `/api/live-sessions/${sessionId}` },
      },
    });
  }

  /**
   * POST /live-sessions/:sessionId/finalize
   * Finalize session for a student - creates their own note with shared content + their typing sections
   */
  @Post('live-sessions/:sessionId/finalize')
  @ApiOperation({
    summary: 'Finalize session for a student',
    description:
      'Creates a new note for the student with shared content (excluding presenter typing sections) and student\'s own typing sections',
  })
  @ApiParam({ name: 'sessionId', description: 'Session ID' })
  @ApiCreatedResponse({ description: 'Student note created (HAL)', schema: { type: 'object' } })
  async finalizeSession(
    @Param('sessionId') sessionId: string,
    @Body() dto: FinalizeSessionDto,
    @CurrentUser() user: { id: string },
  ) {
    this.logger.debug(`finalizeSession sessionId=${sessionId} userId=${user.id}`);

    const result = await this.sessionsService.finalizeSessionForStudent(
      sessionId,
      user.id,
      dto,
    );

    return this.hal.resource(
      {
        note: result.studentNote,
        copiedContent: result.copiedContent,
      },
      {
        self: this.links.self(`/api/notes/${result.studentNote.id}`),
        note: { href: `/api/notes/${result.studentNote.id}` },
        session: { href: `/api/live-sessions/${sessionId}` },
      },
    );
  }
}


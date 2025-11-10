import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  CreateLiveSessionDto,
  CreateInviteDto,
  JoinSessionDto,
  CreateSharedNoteDto,
} from './dto';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assert that a user is a member of a session
   */
  async assertSessionMember(userId: string, sessionId: string): Promise<void> {
    this.logger.debug(`assertSessionMember userId=${userId} sessionId=${sessionId}`);

    const member = await this.prisma.sessionMember.findFirst({
      where: { sessionId, userId },
    });

    if (!member) {
      throw new ForbiddenException('You are not a member of this session');
    }
  }

  /**
   * Assert that a user is the presenter of a session
   */
  async assertPresenter(userId: string, sessionId: string): Promise<void> {
    this.logger.debug(`assertPresenter userId=${userId} sessionId=${sessionId}`);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    if (session.presenterId !== userId) {
      throw new ForbiddenException('Only the presenter can perform this action');
    }
  }

  /**
   * Create a new live session
   */
  async create(userId: string, dto: CreateLiveSessionDto) {
    this.logger.debug(`create userId=${userId} noteId=${dto.noteId}`);

    // Check if note exists
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: dto.noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${dto.noteId} not found`);
    }

    // Create session
    const session = await this.prisma.liveSession.create({
      data: {
        noteId: dto.noteId,
        presenterId: userId,
        title: dto.title,
        liveblocksRoomId: dto.liveblocksRoomId || `session-${Date.now()}`,
      },
      include: {
        note: true,
        presenter: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    // Add presenter as a member
    await this.prisma.sessionMember.create({
      data: {
        sessionId: session.id,
        userId,
        role: 'presenter',
      },
    });

    return session;
  }

  /**
   * Find all active sessions for a user
   */
  async findAllForUser(userId: string) {
    this.logger.debug(`findAllForUser userId=${userId}`);

    const memberships = await this.prisma.sessionMember.findMany({
      where: { userId, leftAt: null },
      include: {
        session: {
          include: {
            note: true,
            presenter: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    displayName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m: any) => m.session);
  }

  /**
   * Find one session by ID
   */
  async findOne(sessionId: string, userId: string) {
    this.logger.debug(`findOne sessionId=${sessionId} userId=${userId}`);

    await this.assertSessionMember(userId, sessionId);

    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        note: true,
        presenter: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
        members: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
        sectionSyncs: {
          include: {
            note: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException(`Session with ID ${sessionId} not found`);
    }

    return session;
  }

  /**
   * End a session
   */
  async endSession(sessionId: string, userId: string) {
    this.logger.debug(`endSession sessionId=${sessionId} userId=${userId}`);

    await this.assertPresenter(userId, sessionId);

    const session = await this.prisma.liveSession.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endedAt: new Date(),
      },
    });

    return session;
  }

  /**
   * Create an invite token for a session
   */
  async createInvite(sessionId: string, userId: string, dto: CreateInviteDto) {
    this.logger.debug(`createInvite sessionId=${sessionId} userId=${userId}`);

    await this.assertPresenter(userId, sessionId);

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    const invite = await this.prisma.sessionInvite.create({
      data: {
        sessionId,
        token,
        expiresAt: new Date(dto.expiresAt),
        maxUses: dto.maxUses,
      },
    });

    return invite;
  }

  /**
   * Validate and use an invite token
   */
  async validateInviteToken(token: string) {
    this.logger.debug(`validateInviteToken token=${token}`);

    const invite = await this.prisma.sessionInvite.findUnique({
      where: { token },
      include: {
        session: {
          include: {
            note: true,
            presenter: {
              select: {
                id: true,
                displayName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!invite) {
      throw new NotFoundException('Invalid invite token');
    }

    if (!invite.isActive) {
      throw new BadRequestException('Invite token is no longer active');
    }

    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite token has expired');
    }

    if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
      throw new BadRequestException('Invite token has reached its maximum uses');
    }

    return invite;
  }

  /**
   * Join a session using an invite token
   */
  async joinSession(token: string, userId: string, dto: JoinSessionDto) {
    this.logger.debug(`joinSession token=${token} userId=${userId}`);

    const invite = await this.validateInviteToken(token);

    // Check if user is already a member
    const existingMember = await this.prisma.sessionMember.findFirst({
      where: { sessionId: invite.sessionId, userId },
    });

    if (existingMember) {
      // Update leftAt to null (rejoin)
      await this.prisma.sessionMember.update({
        where: { id: existingMember.id },
        data: { leftAt: null },
      });
    } else {
      // Create new member
      await this.prisma.sessionMember.create({
        data: {
          sessionId: invite.sessionId,
          userId,
          role: 'listener',
          displayName: dto.displayName,
        },
      });

      // Increment usedCount
      await this.prisma.sessionInvite.update({
        where: { id: invite.id },
        data: { usedCount: { increment: 1 } },
      });
    }

    return invite.session;
  }

  /**
   * Leave a session
   */
  async leaveSession(sessionId: string, userId: string) {
    this.logger.debug(`leaveSession sessionId=${sessionId} userId=${userId}`);

    await this.assertSessionMember(userId, sessionId);

    const member = await this.prisma.sessionMember.findFirst({
      where: { sessionId, userId },
    });

    if (!member) {
      throw new NotFoundException('You are not a member of this session');
    }

    // Don't allow presenter to leave
    if (member.role === 'presenter') {
      throw new BadRequestException('Presenter cannot leave the session. End the session instead.');
    }

    await this.prisma.sessionMember.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });
  }

  /**
   * Get all members of a session
   */
  async getMembers(sessionId: string, userId: string) {
    this.logger.debug(`getMembers sessionId=${sessionId} userId=${userId}`);

    await this.assertSessionMember(userId, sessionId);

    const members = await this.prisma.sessionMember.findMany({
      where: { sessionId, leftAt: null },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    });

    return members;
  }

  /**
   * Get all shared notes in a session
   */
  async getSharedNotes(sessionId: string, userId: string) {
    this.logger.debug(`getSharedNotes sessionId=${sessionId} userId=${userId}`);

    await this.assertSessionMember(userId, sessionId);

    const syncs = await this.prisma.sectionSync.findMany({
      where: { sessionId },
      include: {
        note: true,
      },
    });

    return syncs;
  }

  /**
   * Add a shared note to a session
   */
  async addSharedNote(sessionId: string, userId: string, dto: CreateSharedNoteDto) {
    this.logger.debug(`addSharedNote sessionId=${sessionId} userId=${userId} noteId=${dto.noteId}`);

    await this.assertPresenter(userId, sessionId);

    // Check if note exists
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: dto.noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${dto.noteId} not found`);
    }

    // Check if already shared
    const existing = await this.prisma.sectionSync.findFirst({
      where: { sessionId, noteId: dto.noteId },
    });

    if (existing) {
      throw new ConflictException('Note is already shared in this session');
    }

    // Create section sync
    const sync = await this.prisma.sectionSync.create({
      data: {
        sessionId,
        noteId: dto.noteId,
        mode: dto.mode,
        startSec: dto.startSec ? new Prisma.Decimal(dto.startSec) : null,
        endSec: dto.endSec ? new Prisma.Decimal(dto.endSec) : null,
        pageNumber: dto.pageNumber,
      },
      include: {
        note: true,
      },
    });

    return sync;
  }

  /**
   * Remove a shared note from a session
   */
  async removeSharedNote(sessionId: string, noteId: string, userId: string) {
    this.logger.debug(`removeSharedNote sessionId=${sessionId} noteId=${noteId} userId=${userId}`);

    await this.assertPresenter(userId, sessionId);

    const sync = await this.prisma.sectionSync.findFirst({
      where: { sessionId, noteId },
    });

    if (!sync) {
      throw new NotFoundException('Shared note not found in this session');
    }

    await this.prisma.sectionSync.delete({
      where: { id: sync.id },
    });
  }
}


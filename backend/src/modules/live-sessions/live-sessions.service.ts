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
  CreateTypingSectionDto,
  UpdateTypingSectionDto,
  FinalizeSessionDto,
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
        excludeTyping: dto.excludeTyping !== undefined ? dto.excludeTyping : true,
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

  /**
   * Create a typing section for a student in a session
   */
  async createTypingSection(userId: string, dto: CreateTypingSectionDto) {
    this.logger.debug(`createTypingSection userId=${userId} sessionId=${dto.sessionId}`);

    // Verify user is a member of the session
    await this.assertSessionMember(userId, dto.sessionId);

    // Check if note exists
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: dto.noteId },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${dto.noteId} not found`);
    }

    // Create typing section
    const typingSection = await this.prisma.typingSection.create({
      data: {
        noteId: dto.noteId,
        userId,
        sessionId: dto.sessionId,
        chunkId: dto.chunkId,
        title: dto.title,
        content: dto.content,
        startSec: dto.startSec ? new Prisma.Decimal(dto.startSec) : null,
        endSec: dto.endSec ? new Prisma.Decimal(dto.endSec) : null,
      },
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

    return typingSection;
  }

  /**
   * Update a typing section
   */
  async updateTypingSection(
    typingSectionId: string,
    userId: string,
    dto: UpdateTypingSectionDto,
  ) {
    this.logger.debug(`updateTypingSection id=${typingSectionId} userId=${userId}`);

    // Find the typing section
    const typingSection = await this.prisma.typingSection.findUnique({
      where: { id: typingSectionId },
    });

    if (!typingSection) {
      throw new NotFoundException('Typing section not found');
    }

    // Only the owner can update
    if (typingSection.userId !== userId) {
      throw new ForbiddenException('You can only update your own typing sections');
    }

    // Update typing section
    const updated = await this.prisma.typingSection.update({
      where: { id: typingSectionId },
      data: {
        title: dto.title,
        content: dto.content,
        startSec: dto.startSec !== undefined
          ? (dto.startSec ? new Prisma.Decimal(dto.startSec) : null)
          : undefined,
        endSec: dto.endSec !== undefined
          ? (dto.endSec ? new Prisma.Decimal(dto.endSec) : null)
          : undefined,
      },
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

    return updated;
  }

  /**
   * Delete a typing section
   */
  async deleteTypingSection(typingSectionId: string, userId: string) {
    this.logger.debug(`deleteTypingSection id=${typingSectionId} userId=${userId}`);

    // Find the typing section
    const typingSection = await this.prisma.typingSection.findUnique({
      where: { id: typingSectionId },
    });

    if (!typingSection) {
      throw new NotFoundException('Typing section not found');
    }

    // Only the owner can delete
    if (typingSection.userId !== userId) {
      throw new ForbiddenException('You can only delete your own typing sections');
    }

    await this.prisma.typingSection.delete({
      where: { id: typingSectionId },
    });
  }

  /**
   * Get typing sections for a user in a session
   */
  async getTypingSections(sessionId: string, userId: string) {
    this.logger.debug(`getTypingSections sessionId=${sessionId} userId=${userId}`);

    await this.assertSessionMember(userId, sessionId);

    const typingSections = await this.prisma.typingSection.findMany({
      where: {
        sessionId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return typingSections;
  }

  /**
   * Finalize session for a student - creates a copy of shared notes + student's typing sections
   */
  async finalizeSessionForStudent(
    sessionId: string,
    userId: string,
    dto: FinalizeSessionDto,
  ) {
    this.logger.debug(
      `finalizeSessionForStudent sessionId=${sessionId} userId=${userId}`,
    );

    await this.assertSessionMember(userId, sessionId);

    // Get the session with shared notes
    const session = await this.prisma.liveSession.findUnique({
      where: { id: sessionId },
      include: {
        note: true,
        sectionSyncs: {
          include: {
            note: {
              include: {
                transcript: true,
                translations: true,
                materialPages: true,
                audioRecordings: true,
                inkLayers: true,
                chunks: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (!session.isActive) {
      throw new BadRequestException('Session has already ended');
    }

    // Get student's typing sections
    const studentTypingSections = await this.prisma.typingSection.findMany({
      where: {
        sessionId,
        userId,
      },
    });

    // Create a new note for the student
    const studentNote = await this.prisma.lectureNote.create({
      data: {
        title: dto.noteTitle,
        sourceFileUrl: session.note.sourceFileUrl,
        audioFileUrl: session.note.audioFileUrl,
      },
    });

    // Copy all shared content (excluding typing sections as per excludeTyping flag)
    for (const sync of session.sectionSyncs) {
      if (sync.mode === 'COPY') {
        const sourceNote = sync.note;

        // Copy transcripts
        for (const transcript of sourceNote.transcript) {
          await this.prisma.transcriptSegment.create({
            data: {
              noteId: studentNote.id,
              startSec: transcript.startSec,
              endSec: transcript.endSec,
              text: transcript.text,
            },
          });
        }

        // Copy translations
        for (const translation of sourceNote.translations) {
          await this.prisma.translationSegment.create({
            data: {
              noteId: studentNote.id,
              sourceLang: translation.sourceLang,
              targetLang: translation.targetLang,
              startSec: translation.startSec,
              endSec: translation.endSec,
              text: translation.text,
            },
          });
        }

        // Copy material pages
        for (const page of sourceNote.materialPages) {
          await this.prisma.materialPage.create({
            data: {
              noteId: studentNote.id,
              pageNumber: page.pageNumber,
              pageUrl: page.pageUrl,
              pageHash: page.pageHash,
              canonicalPageId: page.canonicalPageId,
              viewTransform: page.viewTransform as any,
            },
          });
        }

        // Copy audio recordings
        for (const audio of sourceNote.audioRecordings) {
          await this.prisma.audioRecording.create({
            data: {
              noteId: studentNote.id,
              fileUrl: audio.fileUrl,
              durationSec: audio.durationSec,
            },
          });
        }

        // Note: We don't copy ink layers (those are presenter's annotations)
      }
    }

    // Copy student's typing sections to the new note
    for (const typingSection of studentTypingSections) {
      await this.prisma.typingSection.create({
        data: {
          noteId: studentNote.id,
          userId,
          sessionId: null, // No longer linked to session
          chunkId: typingSection.chunkId,
          title: typingSection.title,
          content: typingSection.content,
          startSec: typingSection.startSec,
          endSec: typingSection.endSec,
        },
      });
    }

    // Link to folder if provided
    if (dto.folderId) {
      // Verify folder exists and belongs to user
      const folder = await this.prisma.folder.findFirst({
        where: { id: dto.folderId, userId },
      });

      if (!folder) {
        throw new NotFoundException('Folder not found or does not belong to you');
      }

      await this.prisma.folderLectureNote.create({
        data: {
          folderId: dto.folderId,
          noteId: studentNote.id,
        },
      });
    }

    return {
      studentNote,
      copiedContent: {
        transcriptsCount: session.sectionSyncs.reduce(
          (sum: number, sync) => sum + sync.note.transcript.length,
          0,
        ),
        translationsCount: session.sectionSyncs.reduce(
          (sum: number, sync) => sum + sync.note.translations.length,
          0,
        ),
        materialPagesCount: session.sectionSyncs.reduce(
          (sum: number, sync) => sum + sync.note.materialPages.length,
          0,
        ),
        typingSectionsCount: studentTypingSections.length,
      },
    };
  }
}


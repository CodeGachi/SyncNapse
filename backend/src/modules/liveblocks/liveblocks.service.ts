import { Injectable, ForbiddenException, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Liveblocks } from '@liveblocks/node';

@Injectable()
export class LiveblocksService {
  private readonly logger = new Logger(LiveblocksService.name);
  private readonly liveblocks: Liveblocks;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.LIVEBLOCKS_SECRET_KEY;
    if (!secret) {
      this.logger.warn('LIVEBLOCKS_SECRET_KEY not set. Collaboration features will fail.');
    }
    this.liveblocks = new Liveblocks({ secret: secret || 'sk_dev_placeholder' });
  }

  async authorize(user: { id: string; email: string; displayName: string }, room: string) {
    this.logger.debug(`[authorize] user=${user.email} room=${room}`);

    // Room format: "note:{noteId}"
    if (!room.startsWith('note:')) {
      throw new ForbiddenException('Invalid room format');
    }

    const noteId = room.split(':')[1];
    const permission = await this.checkNoteAccess(user.id, user.email, noteId);

    if (permission === 'NONE') {
      this.logger.warn(`[authorize] Access denied for user ${user.id} to note ${noteId}`);
      throw new ForbiddenException('Access denied');
    }

    // Prepare session
    const session = this.liveblocks.prepareSession(user.id, {
      userInfo: {
        name: user.displayName,
        email: user.email,
        // avatar: user.avatarUrl, // Add if available
        // color: ... // Add if needed
      },
    });

    // Set permissions based on role
    const accessLevel = permission === 'EDITOR' ? ['room:write'] : ['room:read'];
    session.allow(room, session.FULL_ACCESS); // For now give full access if allowed to enter
    // Note: Granular Liveblocks permissions (READ_ONLY vs FULL_ACCESS) can be set here if needed
    // if (permission === 'VIEWER') session.allow(room, session.READ_ACCESS);

    const { body, status } = await session.authorize();
    return { body, status };
  }

  private async checkNoteAccess(userId: string, userEmail: string, noteId: string): Promise<'EDITOR' | 'VIEWER' | 'NONE'> {
    this.logger.debug(`[checkNoteAccess] userId=${userId} email=${userEmail} noteId=${noteId}`);

    // 1. Check Note Existence & Ownership
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: noteId },
      include: {
        foldersLink: { include: { folder: true } }
      }
    });

    if (!note) {
      this.logger.debug(`[checkNoteAccess] Note not found: ${noteId}`);
      return 'NONE';
    }

    this.logger.debug(`[checkNoteAccess] Note found: publicAccess=${note.publicAccess}`);

    // Owner check
    const isOwner = note.foldersLink.some(link => link.folder.userId === userId);
    if (isOwner) {
      this.logger.debug(`[checkNoteAccess] User is owner`);
      return 'EDITOR';
    }

    // 2. Check Collaborator List
    // Check by userId first (most reliable)
    const collabByUser = await this.prisma.noteCollaborator.findFirst({
      where: { noteId, userId }
    });
    if (collabByUser) {
      this.logger.debug(`[checkNoteAccess] Found collaborator by userId: ${collabByUser.permission}`);
      return collabByUser.permission;
    }

    // Check by email (fallback for invites)
    const collabByEmail = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_email: { noteId, email: userEmail } }
    });
    if (collabByEmail) {
      this.logger.debug(`[checkNoteAccess] Found collaborator by email: ${collabByEmail.permission}`);
      return collabByEmail.permission;
    }

    // 3. Check Public Access
    if (note.publicAccess === 'PUBLIC_EDIT') {
      this.logger.debug(`[checkNoteAccess] Public edit access granted`);
      return 'EDITOR';
    }
    if (note.publicAccess === 'PUBLIC_READ') {
      this.logger.debug(`[checkNoteAccess] Public read access granted`);
      return 'VIEWER';
    }

    this.logger.debug(`[checkNoteAccess] No access - publicAccess=${note.publicAccess}`);
    return 'NONE';
  }
}

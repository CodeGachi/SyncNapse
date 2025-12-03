import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { NotePermission, PublicAccess } from '@prisma/client';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { UpdatePublicAccessDto } from './dto/update-public-access.dto';

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Public Access (Link Sharing) ---

  async updatePublicAccess(userId: string, noteId: string, dto: UpdatePublicAccessDto) {
    // Check ownership
    await this.checkOwner(userId, noteId);

    return this.prisma.lectureNote.update({
      where: { id: noteId },
      data: { publicAccess: dto.publicAccess },
    });
  }

  // --- Collaborators (Invites) ---

  async getCollaborators(userId: string, noteId: string) {
    // Owner can see all
    const isOwner = await this.isOwner(userId, noteId);
    if (!isOwner) {
      // Collaborators can only see themselves or maybe list all (depending on policy)
      // Here we restrict to owner or existing collaborator with editor permission?
      // For now, let's allow any collaborator to see the list (like Google Docs)
      const membership = await this.prisma.noteCollaborator.findUnique({
        where: { noteId_email: { noteId, email: await this.getUserEmail(userId) } }
      });
      
      // Fallback: check by userId if email check fails (though we store email)
      // Actually NoteCollaborator links to User if registered.
      const userMembership = await this.prisma.noteCollaborator.findFirst({
        where: { noteId, userId }
      });

      if (!userMembership) {
        throw new ForbiddenException('Not a collaborator on this note');
      }
    }

    return this.prisma.noteCollaborator.findMany({
      where: { noteId },
      include: {
        user: {
          select: { id: true, email: true, displayName: true, authProvider: true }
        }
      }
    });
  }

  async inviteCollaborator(userId: string, noteId: string, dto: CreateCollaboratorDto) {
    await this.checkOwner(userId, noteId);

    // Check if user exists (to link Relation)
    const targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });

    // Check if already invited
    const existing = await this.prisma.noteCollaborator.findUnique({
      where: { noteId_email: { noteId, email: dto.email } }
    });

    if (existing) {
      throw new ConflictException('User is already a collaborator');
    }

    return this.prisma.noteCollaborator.create({
      data: {
        noteId,
        email: dto.email,
        userId: targetUser?.id, // Link if user exists
        permission: dto.permission,
        invitedBy: userId,
      }
    });
  }

  async updateCollaborator(userId: string, noteId: string, collaboratorId: string, dto: UpdateCollaboratorDto) {
    await this.checkOwner(userId, noteId);

    return this.prisma.noteCollaborator.update({
      where: { id: collaboratorId },
      data: { permission: dto.permission },
    });
  }

  async removeCollaborator(userId: string, noteId: string, collaboratorId: string) {
    await this.checkOwner(userId, noteId);

    return this.prisma.noteCollaborator.delete({
      where: { id: collaboratorId },
    });
  }

  // --- Helpers ---

  private async checkOwner(userId: string, noteId: string) {
    const isOwner = await this.isOwner(userId, noteId);
    if (!isOwner) {
      throw new ForbiddenException('Only the owner can manage permissions');
    }
  }

  private async isOwner(userId: string, noteId: string): Promise<boolean> {
    const note = await this.prisma.lectureNote.findUnique({
      where: { id: noteId },
      include: {
        foldersLink: {
          include: { folder: true }
        }
      }
    });

    if (!note) throw new NotFoundException('Note not found');

    // Check if any folder linked to this note belongs to userId
    return note.foldersLink.some(link => link.folder.userId === userId);
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.email || '';
  }
}

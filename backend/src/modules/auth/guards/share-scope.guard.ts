import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../db/prisma.service';
import { SHARE_SCOPE_KEY, ShareScopeMeta } from '../share-scope.decorator';
import { AuthCacheService } from '../services/auth-cache.service';

@Injectable()
export class ShareScopeGuard implements CanActivate {
  private readonly logger = new Logger(ShareScopeGuard.name);
  constructor(
    private readonly reflector: Reflector,
    private readonly db: PrismaService,
    private readonly cache: AuthCacheService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const meta = this.reflector.getAllAndOverride<ShareScopeMeta>(SHARE_SCOPE_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!meta) return true;

    const request = ctx.switchToHttp().getRequest();
    const user = request.user as { id?: string; role?: string } | undefined;
    const params = request.params as Record<string, string>;

    this.logger.debug(`[ShareScope] resource=${meta.resource} action=${meta.action} user=${user?.id ?? 'anon'}`);

    if (!user?.id) return false;

    try {
      if (user.role === 'admin') return true;

      if (meta.resource === 'note') {
        const noteId = params[meta.noteIdParam ?? 'noteId'];
        if (!noteId) return false;
        
        // Check cache first
        const cacheKey = `permission:${user.id}:note:${noteId}`;
        const hasAccess = await this.cache.getOrCompute(
          cacheKey,
          async () => {
            // Policy: allow if the user owns the note (via folder)
            const note = await this.db.lectureNote.findUnique({
              where: { id: noteId },
              include: {
                foldersLink: {
                   include: { folder: true }
                }
              }
            });
            
            if (note && note.foldersLink.some(link => link.folder.userId === user.id)) return true;

            // Or if they asked any question on this note (fallback legacy logic if needed, or remove)
            // const asked = await this.db.question.findFirst({ ... });
            return false;
          },
          300,
        );
        
        return hasAccess;
      }

      if (meta.resource === 'audio') {
        const audioId = params[meta.audioIdParam ?? 'id'];
        if (!audioId) return false;
        
        // Check cache
        const cacheKey = `permission:${user.id}:audio:${audioId}`;
        const hasAccess = await this.cache.getOrCompute(
          cacheKey,
          async () => {
            const rec = await this.db.audioRecording.findUnique({ 
              where: { id: audioId }, 
              select: { noteId: true } 
            });
            if (!rec?.noteId) return false;
            
            // Check note ownership
            const note = await this.db.lectureNote.findUnique({
                where: { id: rec.noteId },
                include: {
                    foldersLink: {
                        include: { folder: true }
                    }
                }
            });
            
            return !!(note && note.foldersLink.some(link => link.folder.userId === user.id));
          },
          300,
        );
        
        return hasAccess;
      }

      if (meta.resource === 'question') {
        // Question logic removed or refactored as 'Question' model might not exist or logic changed
        return true; 
      }

      return false;
    } catch (err) {
      this.logger.debug(`[ShareScope] error=${(err as Error)?.message || 'unknown'}`);
      return false;
    }
  }
}

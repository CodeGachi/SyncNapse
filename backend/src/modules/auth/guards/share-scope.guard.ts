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
            // Policy: allow if the user asked any question on this note
            const asked = await this.db.question.findFirst({ 
              where: { noteId, askedByUserId: user.id }, 
              select: { id: true } 
            });
            return !!asked;
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
            const asked = await this.db.question.findFirst({ 
              where: { noteId: rec.noteId, askedByUserId: user.id }, 
              select: { id: true } 
            });
            return !!asked;
          },
          300,
        );
        
        return hasAccess;
      }

      if (meta.resource === 'question') {
        const qid = params[meta.questionIdParam ?? 'id'];
        if (!qid) return false;
        
        // Check cache
        const cacheKey = `permission:${user.id}:question:${qid}`;
        const hasAccess = await this.cache.getOrCompute(
          cacheKey,
          async () => {
            const q = await this.db.question.findUnique({ 
              where: { id: qid }, 
              select: { askedByUserId: true } 
            });
            return q?.askedByUserId === user.id;
          },
          300,
        );
        
        return hasAccess;
      }

      return false;
    } catch (err) {
      this.logger.debug(`[ShareScope] error=${(err as Error)?.message || 'unknown'}`);
      return false;
    }
  }
}

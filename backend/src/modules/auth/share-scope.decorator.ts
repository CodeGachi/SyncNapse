import { SetMetadata } from '@nestjs/common';

export const SHARE_SCOPE_KEY = 'share-scope';

export interface ShareScopeMeta {
  resource: 'note' | 'audio' | 'question';
  action: 'read' | 'write';
  noteIdParam?: string; // Default: 'noteId'
  audioIdParam?: string; // Default: 'id'
  questionIdParam?: string; // Default: 'id'
}

/**
 * Decorator to protect routes that require shared scope access
 * Users can access resources if they have asked questions on the note
 * 
 * @example
 * @ShareScope({ resource: 'note', action: 'read' })
 * @Get(':noteId/materials')
 * async getMaterials(@Param('noteId') noteId: string) { ... }
 * 
 * @example
 * @ShareScope({ resource: 'audio', action: 'read', audioIdParam: 'audioId' })
 * @Get('audio/:audioId')
 * async getAudio(@Param('audioId') audioId: string) { ... }
 */
export const ShareScope = (meta: ShareScopeMeta) => SetMetadata(SHARE_SCOPE_KEY, meta);
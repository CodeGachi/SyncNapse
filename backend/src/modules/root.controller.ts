import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LinkBuilderService } from './hypermedia/link-builder.service';

@ApiTags('root')
@Controller()
export class RootController {
  private readonly logger = new Logger(RootController.name);

  constructor(private readonly links: LinkBuilderService) {}

  @Get()
  @ApiOperation({ summary: 'API Root (HATEOAS)' })
  getApiRoot() {
    this.logger.debug(`[getApiRoot] ts=${Date.now()}`);
    // Note: Links are relative to API base URL (no /api prefix needed)
    return {
      _links: {
        // Self reference
        self: this.links.self('/'),
        
        // Auth
        auth: this.links.self('/auth'),
        login: this.links.action('/auth/google', 'GET'),
        logout: this.links.action('/auth/logout', 'POST'),
        refresh: this.links.action('/auth/refresh', 'POST'),
        
        // Users
        profile: this.links.self('/users/me'),
        users: this.links.self('/users'),
        
        // Notes
        notes: this.links.self('/notes'),
        noteById: { href: '/notes/{noteId}', templated: true },
        noteContent: { href: '/notes/{noteId}/content', templated: true },
        noteTrashedList: this.links.self('/notes/trash/list'),
        
        // Folders
        folders: this.links.self('/folders'),
        folderById: { href: '/folders/{folderId}', templated: true },
        
        // Files
        files: this.links.self('/files'),
        noteFiles: { href: '/notes/{noteId}/files', templated: true },
        
        // Recordings
        recordings: this.links.self('/recordings'),
        audioRecordings: this.links.self('/audio/recordings'),
        
        // Transcription
        transcription: this.links.self('/transcription'),
        transcriptionSessions: this.links.self('/transcription/sessions'),
        sessionById: { href: '/transcription/sessions/{sessionId}', templated: true },
        
        // Search
        search: this.links.self('/search'),
        searchAll: { href: '/search/all{?q,limit}', templated: true },
        
        // AI
        ai: this.links.self('/ai'),
        aiChat: this.links.action('/ai/chat', 'POST'),
        aiHealth: this.links.self('/ai/health'),
        
        // Sharing
        sharing: this.links.self('/sharing'),
        noteCollaborators: { href: '/notes/{noteId}/collaborators', templated: true },
        notePublicAccess: { href: '/notes/{noteId}/public-access', templated: true },
        
        // Liveblocks
        liveblocks: this.links.self('/liveblocks'),
        liveblocksAuth: this.links.action('/liveblocks/auth', 'POST'),
      },
    };
  }
}

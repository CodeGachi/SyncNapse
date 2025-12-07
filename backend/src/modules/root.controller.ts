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
    // Pure HATEOAS: Only collection links at root level
    // Individual resource links are provided in each collection response
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
        
        // Notes (individual note links provided in /notes response)
        notes: this.links.self('/notes'),
        trashedNotes: this.links.self('/notes/trash/list'),
        
        // Folders (individual folder links provided in /folders response)
        folders: this.links.self('/folders'),
        
        // Files
        files: this.links.self('/files'),
        
        // Recordings
        recordings: this.links.self('/recordings'),
        audioRecordings: this.links.self('/audio/recordings'),
        
        // Transcription (individual session links provided in /transcription/sessions response)
        transcription: this.links.self('/transcription'),
        transcriptionSessions: this.links.self('/transcription/sessions'),
        
        // Search
        search: this.links.self('/search'),
        
        // AI
        ai: this.links.self('/ai'),
        aiChat: this.links.action('/ai/chat', 'POST'),
        aiHealth: this.links.self('/ai/health'),
        
        // Sharing
        sharing: this.links.self('/sharing'),
        
        // Liveblocks
        liveblocks: this.links.self('/liveblocks'),
        liveblocksAuth: this.links.action('/liveblocks/auth', 'POST'),
      },
    };
  }
}

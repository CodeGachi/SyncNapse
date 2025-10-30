import { Controller, Get, Logger } from '@nestjs/common';
import { LinkBuilderService } from './hypermedia/link-builder.service';

@Controller()
export class RootController {
  private readonly logger = new Logger(RootController.name);

  constructor(private readonly links: LinkBuilderService) {}

  @Get()
  getApiRoot() {
    this.logger.debug(`[getApiRoot] ts=${Date.now()}`);
    return {
      _links: {
        self: this.links.self('/api'),
        login: this.links.action('/api/auth/login', 'GET'),
        profile: this.links.self('/api/users/me'),
        sessions: this.links.self('/api/sessions'),
      },
    };
  }
}

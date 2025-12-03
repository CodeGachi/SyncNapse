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

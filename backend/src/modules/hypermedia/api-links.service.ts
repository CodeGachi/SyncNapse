import { Injectable, Logger } from '@nestjs/common';
import { LinkBuilderService } from './link-builder.service';

type OpenApiDoc = {
  paths?: Record<string, Record<string, unknown>>;
};

@Injectable()
export class ApiLinksService {
  private readonly logger = new Logger(ApiLinksService.name);
  private openApiDoc?: OpenApiDoc;

  constructor(private readonly links: LinkBuilderService) {}

  setOpenApiDocument(doc: OpenApiDoc) {
    this.openApiDoc = doc;
    const numPaths = Object.keys(doc?.paths || {}).length;
    this.logger.log(`OpenAPI document loaded for links: paths=${numPaths}`);
  }

  buildApiRootLinks(): Record<string, { href: string; method?: string }> {
    const result: Record<string, { href: string; method?: string }> = {};

    result.self = this.links.self('/api');
    result.docs = this.links.self('/docs');
    result.openapi = this.links.self('/api/docs-json');

    const paths = this.openApiDoc?.paths || {};
    for (const originalPath of Object.keys(paths)) {
      const methods = paths[originalPath] as Record<string, unknown>;
      const withoutApi = originalPath.replace(/^\/api(\/|$)/, '/');
      const normPath = withoutApi.startsWith('/') ? withoutApi : `/${withoutApi}`;

      const clean = normPath.replace(/^\//, '');
      const segments = clean.length ? clean.split('/') : [];
      if (segments.length === 0) continue;
      const relSegments = segments[0] === 'api' ? segments.slice(1) : segments;
      const relBase = relSegments.join('.'); // e.g., users.me

      for (const method of Object.keys(methods)) {
        const upper = method.toUpperCase();
        if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(upper)) continue;

        const href = `/api${normPath === '/' ? '' : normPath}`;
        const rel = upper === 'GET' ? relBase : `${relBase}.${method.toLowerCase()}`;
        if (upper === 'GET') {
          result[rel] = this.links.self(href);
        } else {
          result[rel] = this.links.action(href, upper);
        }
      }
    }

    return result;
  }
}

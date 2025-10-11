import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { LinkBuilderService } from './link-builder.service';

@Catch()
@Injectable()
export class HalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HalExceptionFilter.name);

  constructor(private readonly links: LinkBuilderService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    let status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const errBody = isHttp ? (exception.getResponse() as any) : { message: 'Internal Server Error' };

    if (status === HttpStatus.BAD_REQUEST && Array.isArray(errBody?.message)) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    }

    const anyErr = exception as any;
    const prismaCode = (anyErr?.code || anyErr?.errorCode || anyErr?.meta?.code || (/(P\d{4})/.exec(anyErr?.message || '')?.[1])) as string | undefined;
    try {
      this.logger.error(`[HalException] type=${anyErr?.constructor?.name || 'unknown'} code=${prismaCode || 'none'} ts=${Date.now()}`);
    } catch (err) {
      // intentionally swallow logging errors
    }

    switch (prismaCode) {
      case 'P2002': // Unique constraint failed
        status = HttpStatus.CONFLICT;
        break;
      case 'P2003': // Foreign key constraint failed
      case 'P2014': // Relation violation
        status = HttpStatus.CONFLICT;
        break;
      case 'P2025': // Record not found for update/delete
      case 'P2001': // Record does not exist
        status = HttpStatus.NOT_FOUND;
        break;
      case 'P2021': // Table does not exist
      case 'P2022': // Column does not exist
      case 'P1001': // DB not reachable
      case 'P1002': // DB timed out
        status = HttpStatus.SERVICE_UNAVAILABLE;
        break;
      case 'P2000': // Value too long
        status = HttpStatus.PAYLOAD_TOO_LARGE;
        break;
    }

    const message: string | string[] = Array.isArray(errBody?.message) ? errBody.message : (errBody?.message || String(exception));

    this.logger.warn(`[HalException] status=${status} path=${request.url} ts=${Date.now()} msg=${Array.isArray(message) ? message.join('|') : message}`);

    const links: Record<string, { href: string; method?: string }> = {
      self: this.links.self(request.url),
      home: this.links.self('/api'),
    };

    if (request.url.startsWith('/api/sessions')) {
      links.list = this.links.self('/api/sessions');
      links.create = this.links.action('/api/sessions', 'POST');
      const m = request.url.match(/^\/api\/sessions\/([^\/]+)/);
      if (m) {
        const sid = m[1];
        links.session = this.links.self(`/api/sessions/${sid}`);
        if (request.url.includes('/notes')) {
          links.notes = this.links.self(`/api/sessions/${sid}/notes`);
        }
        if (request.url.includes('/audios')) {
          links.audios = this.links.self(`/api/sessions/${sid}/audios`);
        }
        if (request.url.includes('/materials')) {
          links.materials = this.links.self(`/api/sessions/${sid}/materials`);
        }
      }
    }

    if (status === HttpStatus.UNAUTHORIZED) {
      links.login = this.links.action('/api/auth/login', 'POST');
      links.profile = this.links.self('/api/users/me');
    }
    if (status === HttpStatus.FORBIDDEN) {
      links.profile = this.links.self('/api/users/me');
    }
    links.docs = this.links.self('/docs');

    if (status === HttpStatus.UNAUTHORIZED) {
      response.setHeader('WWW-Authenticate', 'Bearer');
    }

    const code = this.mapStatusToCode(status);
    const details = Array.isArray(errBody?.message) ? errBody.message : (errBody?.errors || undefined);

    response.status(status);
    response.setHeader('Content-Type', 'application/hal+json');
    response.json({
      error: {
        statusCode: status,
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
        path: request.url,
      },
      _links: links,
    });
  }

  private mapStatusToCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'bad_request';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'validation_failed';
      case HttpStatus.UNAUTHORIZED:
        return 'unauthorized';
      case HttpStatus.FORBIDDEN:
        return 'forbidden';
      case HttpStatus.NOT_FOUND:
        return 'not_found';
      case HttpStatus.CONFLICT:
        return 'conflict';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'rate_limited';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'service_unavailable';
      case HttpStatus.GATEWAY_TIMEOUT:
        return 'upstream_timeout';
      case HttpStatus.BAD_GATEWAY:
        return 'upstream_error';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'payload_too_large';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'unsupported_media_type';
      default:
        return 'internal_error';
    }
  }
}

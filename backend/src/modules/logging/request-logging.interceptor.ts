import { CallHandler, ExecutionContext, Injectable, NestInterceptor, HttpException } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggingService } from './logging.service';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor<unknown, unknown> {
  constructor(private readonly logging: LoggingService) {}
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{ method?: string; originalUrl?: string; url?: string; headers?: Record<string, unknown>; ip?: string; connection?: { remoteAddress?: string }; get?: (name: string) => string; user?: { id?: string } }>();
    const res = context.switchToHttp().getResponse<{ statusCode?: number }>();
    const start = Date.now();
    const method = req?.method;
    const url = req?.originalUrl || req?.url;
    const requestId = (req?.headers?.['x-request-id'] as string) || undefined;
    // Extract user-agent and ensure it's string | undefined for type safety
    const userAgent = ((req?.get && req.get('user-agent')) || req?.headers?.['user-agent'] || undefined) as string | undefined;
    const ip = req?.ip || req?.connection?.remoteAddress || undefined;
    return next.handle().pipe(
      // success path
      tap({
        next: () => {
          const ms = Date.now() - start;
          const statusCode = res?.statusCode;
          const payload = { requestId, method, url, statusCode, ms, ip, userAgent } as Record<string, unknown>;
          if (typeof statusCode === 'number') {
            if (statusCode >= 500) {
              this.logging.error('http_request', payload);
            } else if (statusCode >= 400) {
              this.logging.warn('http_request', payload);
            } else if (statusCode >= 300) {
              this.logging.log('http_request', { ...payload, redirect: true });
            } else {
              this.logging.log('http_request', payload);
            }
          } else {
            this.logging.log('http_request', payload);
          }
          void this.logging.audit({ requestId, userId: req?.user?.id, method, path: url, status: statusCode, ip, userAgent });
        },
        error: (err: unknown) => {
          // In error path, prefer HttpException status over response.statusCode (which may still be 200 before filters run)
          const ms = Date.now() - start;
          const statusFromError = err instanceof HttpException ? err.getStatus() : undefined;
          const statusFromResponse = (res?.statusCode && Number(res.statusCode)) || undefined;
          const statusCode = statusFromError ?? statusFromResponse ?? 500;
          const payload: Record<string, unknown> = {
            requestId,
            method,
            url,
            statusCode,
            ms,
            ip,
            userAgent,
            errorName: (err as { name?: string })?.name,
          };
          if (statusCode >= 500) {
            this.logging.error('http_request', payload);
          } else {
            this.logging.warn('http_request', payload);
          }
          void this.logging.audit({ requestId, userId: req?.user?.id, method, path: url, status: statusCode, ip, userAgent, extra: { error: (err as Error)?.message } });
        },
      }),
    );
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor<unknown, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const start = Date.now();
    const method = req?.method;
    const url = req?.url;
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        console.log(JSON.stringify({ level: 'info', msg: 'http_request', method, url, ms }));
      }),
    );
  }
}

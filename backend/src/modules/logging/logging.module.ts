import { Module } from '@nestjs/common';
import { LoggingService } from './logging.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Module({
  providers: [LoggingService, RequestLoggingInterceptor],
  exports: [LoggingService, RequestLoggingInterceptor],
})
export class LoggingModule {}

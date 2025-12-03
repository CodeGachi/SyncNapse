import { Module } from '@nestjs/common';
import { DbModule } from '../db/db.module';
import { LoggingService } from './logging.service';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

@Module({
  imports: [DbModule],
  providers: [LoggingService, RequestLoggingInterceptor],
  exports: [LoggingService, RequestLoggingInterceptor],
})
export class LoggingModule {}

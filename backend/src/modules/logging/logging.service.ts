import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private readonly logger = new Logger('App');

  log(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger.log(`${message} ${JSON.stringify(meta)}`);
    } else {
      this.logger.log(message);
    }
  }

  warn(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger.warn(`${message} ${JSON.stringify(meta)}`);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, meta?: Record<string, unknown>) {
    if (meta) {
      this.logger.error(`${message} ${JSON.stringify(meta)}`);
    } else {
      this.logger.error(message);
    }
  }
}

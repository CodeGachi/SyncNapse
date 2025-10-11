import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggingService {
  private writeJsonToStdout(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: Record<string, unknown>) {
    const payload = { timestamp: new Date().toISOString(), level, service: 'backend', msg: message, ...(meta || {}) };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(payload));
  }

  log(message: string, meta?: Record<string, unknown>) {
    this.writeJsonToStdout('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>) {
    this.writeJsonToStdout('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>) {
    this.writeJsonToStdout('error', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>) {
    this.writeJsonToStdout('debug', message, meta);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class LoggingService {
  constructor(private readonly prisma: PrismaService) {}
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

  async audit(payload: { userId?: string; method?: string; path?: string; status?: number; ip?: string; userAgent?: string; requestId?: string; action?: string; resourceId?: string; extra?: Record<string, unknown> }) {
    try {
      await this.prisma.auditLog.create({ data: {
        userId: payload.userId,
        method: payload.method,
        path: payload.path,
        status: payload.status,
        ip: payload.ip,
        userAgent: payload.userAgent,
        requestId: payload.requestId,
        action: payload.action,
        resourceId: payload.resourceId,
        payload: (payload.extra ?? null) as Prisma.InputJsonValue,
      } });
    } catch (err) {
      this.warn('audit_failed', { error: (err as Error)?.message || 'unknown' });
    }
  }
}

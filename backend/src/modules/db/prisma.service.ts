import { INestApplication, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    const raw = process.env.DATABASE_URL ?? '';
    const hasUrl = raw.length > 0;
    try {
      const url = hasUrl ? new URL(raw) : null;
      const hostInfo = url ? `${url.protocol}//${url.hostname}:${url.port || 'default'}/${url.pathname.replace(/^\//, '')}` : 'N/A';
      console.debug(`[db] DATABASE_URL set=${hasUrl} host=${hostInfo}`);
    } catch {
      console.debug(`[db] DATABASE_URL set=${hasUrl} host=invalid-url`);
    }

    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { SecurityService } from '../security/security.service';
import { PostprocessService } from '../postprocess/postprocess.service';
import { createWriteStream, existsSync, mkdirSync, writeFileSync, createReadStream } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  constructor(
    private readonly db: PrismaService,
    private readonly security: SecurityService,
    private readonly post: PostprocessService,
  ) {}

  private getDirs() {
    const base = process.cwd();
    const partsDir = process.env.UPLOAD_DIR ?? join(base, 'var', 'uploads', 'parts');
    const assembledDir = process.env.UPLOAD_ASSEMBLED_DIR ?? join(base, 'var', 'uploads', 'assembled');
    if (!existsSync(partsDir)) mkdirSync(partsDir, { recursive: true });
    if (!existsSync(assembledDir)) mkdirSync(assembledDir, { recursive: true });
    return { partsDir, assembledDir };
  }

  async start(body: { fileName: string; mimeType?: string; totalChunks: number; totalSizeBytes?: number; checksumSha256?: string }) {
    const { fileName, mimeType, totalChunks, totalSizeBytes, checksumSha256 } = body;
    this.logger.debug(`[start] file=${fileName} chunks=${totalChunks} size=${totalSizeBytes ?? 'n/a'}`);
    const up = await this.db.upload.create({
      data: {
        fileName,
        mimeType,
        totalChunks,
        totalSizeBytes,
        checksumSha256,
        status: 'RECEIVING',
      },
    });
    return { id: up.id };
  }

  async saveChunk(id: string, index: number, file: { buffer: Buffer; size: number }) {
    const { partsDir } = this.getDirs();
    const upload = await this.db.upload.findUnique({ where: { id } });
    if (!upload) throw new Error('upload not found');
    const key = join(partsDir, `${id}.${index}.part`);
    this.logger.debug(`[saveChunk] id=${id} index=${index} size=${file.size}`);
    writeFileSync(key, file.buffer);
    await this.db.uploadChunk.upsert({
      where: { uploadId_index: { uploadId: id, index } },
      update: { sizeBytes: file.size },
      create: { uploadId: id, index, sizeBytes: file.size },
    });
    const count = await this.db.uploadChunk.count({ where: { uploadId: id } });
    await this.db.upload.update({ where: { id }, data: { receivedChunks: count } });
    return { ok: true, receivedChunks: count };
  }

  async complete(id: string) {
    const { partsDir, assembledDir } = this.getDirs();
    const up = await this.db.upload.findUnique({ where: { id } });
    if (!up) throw new Error('upload not found');
    this.logger.debug(`[complete] id=${id} expectedChunks=${up.totalChunks}`);
    const outPath = join(assembledDir, `${id}-${up.fileName}`);
    const out = createWriteStream(outPath);
    for (let i = 0; i < up.totalChunks; i++) {
      const partPath = join(partsDir, `${id}.${i}.part`);
      if (!existsSync(partPath)) throw new Error(`missing part index=${i}`);
      await new Promise<void>((resolve, reject) => {
        const rs = createReadStream(partPath);
        rs.on('error', reject);
        rs.on('end', resolve);
        rs.pipe(out, { end: false });
      });
    }
    await new Promise<void>((resolve) => out.end(resolve));
    // Run security scan stub
    const scan = await this.security.scanFile(outPath);
    this.logger.debug(`[complete] scan engine=${scan.engine} virus=${scan.hasVirus} password=${scan.isPasswordProtected}`);
    
    // Post-process: run conversion+indexing synchronously (TODO: implement queue for background processing)
    const conv = await this.post.convertIfNeeded(outPath, up.mimeType ?? undefined);
    const target = this.post.getIndexingTarget(up.mimeType ?? undefined);
    await this.post.indexIfEnabled(conv.convertedPath ?? outPath, target);
    await this.db.upload.update({ where: { id }, data: { storageKey: conv.convertedPath ?? outPath } });

    await this.db.upload.update({ where: { id }, data: { status: 'COMPLETED', storageKey: outPath, completedAt: new Date() } });
    return { ok: true, storageKey: outPath };
  }

  async status(id: string) {
    const up = await this.db.upload.findUnique({ where: { id }, include: { chunks: true } });
    if (!up) throw new Error('upload not found');
    return up;
  }
}

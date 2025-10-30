import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  constructor(private readonly db: PrismaService) {}

  private getDir() {
    const base = process.cwd();
    const dir = process.env.EXPORT_DIR ?? join(base, 'var', 'exports');
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    return dir;
  }

  async createExportForNote(noteId: string) {
    const dir = this.getDir();
    const note = await this.db.lectureNote.findUnique({ where: { id: noteId }, include: { transcript: true, translations: true, typingSections: true } });
    if (!note) throw new Error('note not found');
    const payload = {
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      transcriptSegments: note.transcript?.length ?? 0,
      translationSegments: note.translations?.length ?? 0,
      typingSections: note.typingSections?.length ?? 0,
      generatedAt: Date.now(),
    };
    const file = join(dir, `${note.id}.json`);
    writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    this.logger.debug(`[createExportForNote] noteId=${noteId} file=${file}`);
    return { file };
  }

  async readExport(file: string) {
    const buf = readFileSync(file);
    return { content: buf };
  }
}



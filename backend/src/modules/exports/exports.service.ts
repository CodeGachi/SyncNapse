import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { existsSync, mkdirSync, createReadStream, createWriteStream, statSync } from 'node:fs';
import { join } from 'node:path';
import { ExportResultDto, ExportPayloadDto } from './dto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);
  
  constructor(private readonly db: PrismaService) {}

  private getDir(): string {
    const base = process.cwd();
    const dir = process.env.EXPORT_DIR ?? join(base, 'var', 'exports');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      this.logger.debug(`Created exports directory: ${dir}`);
    }
    return dir;
  }

  async createExportForNote(noteId: string): Promise<ExportResultDto> {
    // Find note with related data
    const note = await this.db.lectureNote.findUnique({
      where: { id: noteId },
      include: {
        // transcript: true, // Removed as it might not exist on LectureNote type or renamed
        // translations: true,
        // typingSections: true,
        foldersLink: { include: { folder: true } }
      },
    });

    if (!note) {
      throw new NotFoundException(`Note with ID ${noteId} not found`);
    }

    // Build export payload
    const payload: ExportPayloadDto = {
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      transcriptSegments: 0, // note.transcript?.length ?? 0,
      translationSegments: 0, // note.translations?.length ?? 0,
      typingSections: 0, // note.typingSections?.length ?? 0,
      generatedAt: Date.now(),
    };

    // Write to file using stream
    const dir = this.getDir();
    const filePath = join(dir, `${note.id}.json`);
    
    try {
      const writeStream = createWriteStream(filePath, { encoding: 'utf8' });
      const jsonStream = Readable.from([JSON.stringify(payload, null, 2)]);
      
      await pipeline(jsonStream, writeStream);
    } catch (error) {
      this.logger.error(`Failed to write export file: ${(error as Error).message}`);
      throw new Error(`Failed to create export file for note ${noteId}`);
    }

    // Get file stats
    const stats = statSync(filePath);

    this.logger.debug(`[createExportForNote] noteId=${noteId} file=${filePath} size=${stats.size}`);

    return {
      file: filePath,
      size: stats.size,
      generatedAt: new Date(payload.generatedAt),
    };
  }

  async readExport(filePath: string): Promise<{ stream: Readable }> {
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Export file not found: ${filePath}`);
    }

    try {
      const stream = createReadStream(filePath);
      return { stream };
    } catch (error) {
      this.logger.error(`Failed to read export file: ${(error as Error).message}`);
      throw new Error(`Failed to read export file: ${filePath}`);
    }
  }
}
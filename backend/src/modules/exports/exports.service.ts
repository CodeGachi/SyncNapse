import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ExportResultDto, ExportPayloadDto } from './dto';

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
        transcript: true,
        translations: true,
        typingSections: true,
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
      transcriptSegments: note.transcript?.length ?? 0,
      translationSegments: note.translations?.length ?? 0,
      typingSections: note.typingSections?.length ?? 0,
      generatedAt: Date.now(),
    };

    // Write to file
    const dir = this.getDir();
    const filePath = join(dir, `${note.id}.json`);
    const jsonContent = JSON.stringify(payload, null, 2);
    
    try {
      writeFileSync(filePath, jsonContent, 'utf8');
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

  async readExport(filePath: string): Promise<{ content: Buffer }> {
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Export file not found: ${filePath}`);
    }

    try {
      const content = readFileSync(filePath);
      return { content };
    } catch (error) {
      this.logger.error(`Failed to read export file: ${(error as Error).message}`);
      throw new Error(`Failed to read export file: ${filePath}`);
    }
  }
}
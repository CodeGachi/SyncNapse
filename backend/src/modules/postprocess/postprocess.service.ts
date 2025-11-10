import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'node:child_process';

export type ConversionResult = {
  convertedPath?: string;
  format?: string;
};

export type IndexingTarget = {
  enabled: boolean;
  kind: 'text' | 'audio' | 'image' | 'pdf' | 'other';
};

@Injectable()
export class PostprocessService {
  private readonly logger = new Logger(PostprocessService.name);

  getIndexingTarget(mime: string | undefined): IndexingTarget {
    const map: Record<string, IndexingTarget> = {
      'application/pdf': { enabled: true, kind: 'pdf' },
      'text/plain': { enabled: true, kind: 'text' },
      'audio/mpeg': { enabled: true, kind: 'audio' },
      'audio/wav': { enabled: true, kind: 'audio' },
    };
    return map[mime ?? ''] ?? { enabled: false, kind: 'other' };
  }

  async convertIfNeeded(inputPath: string, mime?: string): Promise<ConversionResult> {
    this.logger.debug(`[convertIfNeeded] ts=${Date.now()} path=${inputPath} mime=${mime ?? 'unknown'}`);
    // Stub: no real conversion; place hooks for ffmpeg/imagick/pdf2image, etc.
    return { convertedPath: inputPath, format: mime };
  }

  async indexIfEnabled(path: string, target: IndexingTarget) {
    this.logger.debug(`[indexIfEnabled] ts=${Date.now()} path=${path} target=${target.kind} enabled=${target.enabled}`);
    if (!target.enabled) return { indexed: false };
    // Stub: enqueue to an indexer; for now, just return ok
    return { indexed: true };
  }

  isAudio(mime?: string) {
    return typeof mime === 'string' && mime.startsWith('audio/');
  }

  async normalizeAudio(inputPath: string): Promise<{ normalizedPath: string }> {
    this.logger.debug(`[normalizeAudio] ts=${Date.now()} path=${inputPath}`);
    // Stub: return the original path; integrate ffmpeg here later
    return { normalizedPath: inputPath };
  }

  async probeAudioDurationSec(inputPath: string): Promise<number | undefined> {
    try {
      const out = execFileSync('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'default=nw=1:nk=1',
        inputPath,
      ], { encoding: 'utf8' });
      const val = parseFloat((out || '').trim());
      if (Number.isFinite(val)) return val;
      return undefined;
    } catch (err) {
      this.logger.debug(`[probeAudioDurationSec] failed err=${(err as Error)?.message || 'unknown'}`);
      return undefined;
    }
  }
}

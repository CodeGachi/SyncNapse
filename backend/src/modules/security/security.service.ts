import { Injectable, Logger } from '@nestjs/common';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execFileAsync = promisify(execFile);

export type ScanResult = {
  hasVirus: boolean;
  isPasswordProtected: boolean;
  engine: string;
  details?: string;
};

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  /**
   * Scan a file for viruses using ClamAV (clamdscan or clamscan)
   * If ClamAV is not installed/configured, it acts as a pass-through stub.
   */
  async scanFile(filePath: string): Promise<ScanResult> {
    this.logger.debug(`[scanFile] Scanning file: ${filePath}`);

    // Check if we should run real scan
    if (process.env.ENABLE_VIRUS_SCAN === 'true') {
      try {
        // Try using clamdscan (faster, requires daemon)
        // Use execFile to avoid shell injection
        const { stdout } = await execFileAsync('clamdscan', ['--no-summary', filePath]);
        
        if (stdout.includes('FOUND')) {
          this.logger.warn(`[scanFile] 🚨 Virus FOUND in file: ${filePath}`);
          return {
            hasVirus: true,
            isPasswordProtected: false,
            engine: 'ClamAV',
            details: stdout.trim(),
          };
        }
      } catch (error: any) {
        // clamdscan returns exit code 1 if virus found
        if (error.stdout && error.stdout.includes('FOUND')) {
           this.logger.warn(`[scanFile] 🚨 Virus FOUND in file: ${filePath}`);
           return {
             hasVirus: true,
             isPasswordProtected: false,
             engine: 'ClamAV',
             details: error.stdout.trim(),
           };
        }

        this.logger.error(`[scanFile] Scan failed or error: ${error.message}`);
        // Fallback or fail open/closed based on policy
        // Here we fail open (assume safe) but log error, to avoid blocking users if scanner is down
        // In high security, you might want to return hasVirus: true or throw error
      }
    } else {
      this.logger.debug(`[scanFile] Virus scan disabled (ENABLE_VIRUS_SCAN!=true), skipping.`);
    }

    return {
      hasVirus: false,
      isPasswordProtected: false,
      engine: process.env.VIRUS_ENGINE ?? 'stub',
    };
  }
  
  /**
   * Scan a buffer (writes to temp file then scans)
   */
  async scanBuffer(buffer: Buffer, fileName: string): Promise<ScanResult> {
    const tempPath = `/tmp/scan_${Date.now()}_${fileName}`;
    try {
      fs.writeFileSync(tempPath, buffer);
      const result = await this.scanFile(tempPath);
      return result;
    } finally {
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }
}

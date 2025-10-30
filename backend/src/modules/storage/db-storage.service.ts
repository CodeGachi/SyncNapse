import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

//  WARNING: DB Storage Service
//  This service stores files directly in PostgreSQL using BYTEA.
//  USE ONLY IF:
//  - Files are small (< 10MB)
//  - Total files < 10GB
//  - Transactional atomicity is critical
//  FOR PRODUCTION: Use StorageService with S3/GCS instead!
@Injectable()
export class DbStorageService {
  private readonly logger = new Logger(DbStorageService.name);
  private readonly maxFileSize = 104857600; // 100MB (safety limit)

  constructor(private readonly db: PrismaService) {
    this.logger.warn('⚠️  DbStorageService is active! Consider using S3/GCS for production.');
  }

  //  Store a file in PostgreSQL
  async storeFile(localPath: string, metadata: { fileName: string; mimeType?: string }): Promise<{ id: string; size: number }> {
    const buffer = readFileSync(localPath);
    const sizeBytes = buffer.length;

    if (sizeBytes > this.maxFileSize) {
      throw new Error(`File too large: ${sizeBytes} bytes (max ${this.maxFileSize}). Use S3 instead!`);
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');

    this.logger.debug(`[storeFile] name=${metadata.fileName} size=${sizeBytes} bytes`);

    const fileBlob = await this.db.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "FileBlob" (id, "fileName", "mimeType", "sizeBytes", data, checksum, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${metadata.fileName},
        ${metadata.mimeType || null},
        ${sizeBytes},
        ${buffer},
        ${checksum},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    this.logger.debug(`[storeFile] fileBlob type=${typeof fileBlob} length=${Array.isArray(fileBlob) ? fileBlob.length : 'N/A'}`);
    
    if (!fileBlob || !Array.isArray(fileBlob) || fileBlob.length === 0) {
      throw new Error('Failed to insert file: no ID returned from database');
    }

    return { id: fileBlob[0].id, size: sizeBytes };
  }

  //  Store a buffer directly
  async storeBuffer(buffer: Buffer, metadata: { fileName: string; mimeType?: string }): Promise<{ id: string; size: number }> {
    const sizeBytes = buffer.length;

    if (sizeBytes > this.maxFileSize) {
      throw new Error(`File too large: ${sizeBytes} bytes (max ${this.maxFileSize}). Use S3 instead!`);
    }

    const checksum = createHash('sha256').update(buffer).digest('hex');

    this.logger.debug(`[storeBuffer] name=${metadata.fileName} size=${sizeBytes} bytes`);

    const result = await this.db.$queryRaw<Array<{ id: string }>>`
      INSERT INTO "FileBlob" (id, "fileName", "mimeType", "sizeBytes", data, checksum, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${metadata.fileName},
        ${metadata.mimeType || null},
        ${sizeBytes},
        ${buffer},
        ${checksum},
        NOW(),
        NOW()
      )
      RETURNING id
    `;

    this.logger.debug(`[storeBuffer] result type=${typeof result} length=${Array.isArray(result) ? result.length : 'N/A'}`);
    
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Failed to insert buffer: no ID returned from database');
    }

    return { id: result[0].id, size: sizeBytes };
  }

  //  Retrieve file data from DB
  async getFile(id: string): Promise<{ buffer: Buffer; metadata: { fileName: string; mimeType?: string; sizeBytes: number } }> {
    this.logger.debug(`[getFile] id=${id}`);

    const result = await this.db.$queryRaw<Array<{
      fileName: string;
      mimeType: string | null;
      sizeBytes: number;
      data: Buffer;
    }>>`
      SELECT "fileName", "mimeType", "sizeBytes", data
      FROM "FileBlob"
      WHERE id = ${id}
    `;

    if (!result || result.length === 0) {
      throw new Error(`File not found: ${id}`);
    }

    const file = result[0];

    return {
      buffer: file.data,
      metadata: {
        fileName: file.fileName,
        mimeType: file.mimeType || undefined,
        sizeBytes: file.sizeBytes,
      },
    };
  }

  //  Get file metadata only (without data)
  async getMetadata(id: string): Promise<{ fileName: string; mimeType?: string; sizeBytes: number; checksum: string }> {
    const result = await this.db.$queryRaw<Array<{
      fileName: string;
      mimeType: string | null;
      sizeBytes: number;
      checksum: string;
    }>>`
      SELECT "fileName", "mimeType", "sizeBytes", checksum
      FROM "FileBlob"
      WHERE id = ${id}
    `;

    if (!result || result.length === 0) {
      throw new Error(`File not found: ${id}`);
    }

    const meta = result[0];
    return {
      fileName: meta.fileName,
      mimeType: meta.mimeType || undefined,
      sizeBytes: meta.sizeBytes,
      checksum: meta.checksum,
    };
  }

  //  Delete a file from DB
  async deleteFile(id: string): Promise<void> {
    this.logger.debug(`[deleteFile] id=${id}`);

    await this.db.$executeRaw`
      DELETE FROM "FileBlob"
      WHERE id = ${id}
    `;
  }

  //  Get total storage usage
  async getStorageStats(): Promise<{ totalFiles: number; totalBytes: number; averageBytes: number }> {
    const result = await this.db.$queryRaw<Array<{
      totalFiles: bigint;
      totalBytes: bigint;
      averageBytes: number;
    }>>`
      SELECT
        COUNT(*) as "totalFiles",
        SUM("sizeBytes") as "totalBytes",
        AVG("sizeBytes") as "averageBytes"
      FROM "FileBlob"
    `;

    const stats = result[0];
    return {
      totalFiles: Number(stats.totalFiles),
      totalBytes: Number(stats.totalBytes),
      averageBytes: stats.averageBytes || 0,
    };
  }

  //  Check if approaching storage limits
  async checkStorageLimits(): Promise<{ isWarning: boolean; message: string }> {
    const stats = await this.getStorageStats();
    const totalGB = stats.totalBytes / (1024 ** 3);

    if (totalGB > 50) {
      return {
        isWarning: true,
        message: `⚠️  DB storage is ${totalGB.toFixed(2)}GB! Strongly consider migrating to S3.`,
      };
    } else if (totalGB > 10) {
      return {
        isWarning: true,
        message: `⚠️  DB storage is ${totalGB.toFixed(2)}GB. Consider migrating to S3 soon.`,
      };
    }

    return {
      isWarning: false,
      message: `DB storage: ${totalGB.toFixed(2)}GB (within limits)`,
    };
  }
}


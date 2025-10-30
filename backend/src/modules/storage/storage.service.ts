import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface UploadResult {
  storageKey: string;
  publicUrl?: string;
  size?: number;
}

//  Storage abstraction layer supporting multiple storage providers
//  - local: Local filesystem (development)
//  - s3: AWS S3 or S3-compatible (MinIO, DigitalOcean Spaces, etc.)
//  - gcs: Google Cloud Storage
//  - azure: Azure Blob Storage
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly config: StorageConfig;
  private readonly localBasePath: string;
  private s3Client?: S3Client;

  constructor() {
    this.config = {
      provider: (process.env.STORAGE_PROVIDER as StorageConfig['provider']) || 'local',
      bucket: process.env.STORAGE_BUCKET,
      region: process.env.STORAGE_REGION || 'us-east-1',
      endpoint: process.env.STORAGE_ENDPOINT,
      accessKeyId: process.env.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY,
    };

    this.localBasePath = process.env.STORAGE_LOCAL_PATH || join(process.cwd(), 'var', 'storage');
    this.logger.log(`Storage provider: ${this.config.provider}`);

    if (this.config.provider === 'local') {
      this.ensureLocalDirs();
    } else if (this.config.provider === 's3') {
      this.initializeS3Client();
    }
  }

  private initializeS3Client() {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('S3 credentials not provided. Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY');
    }

    this.s3Client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
      forcePathStyle: !!this.config.endpoint,
    });

    this.logger.log(`S3 client initialized: endpoint=${this.config.endpoint || 'AWS S3'}, region=${this.config.region}`);
  }

  private ensureLocalDirs() {
    const dirs = [
      this.localBasePath,
      join(this.localBasePath, 'audio'),
      join(this.localBasePath, 'documents'),
      join(this.localBasePath, 'pages'),
      join(this.localBasePath, 'uploads'),
    ];
    dirs.forEach((dir) => {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        this.logger.debug(`Created local directory: ${dir}`);
      }
    });
  }

  //  Upload a file to storage
  async uploadFile(localPath: string, storageKey: string): Promise<UploadResult> {
    this.logger.debug(`[uploadFile] provider=${this.config.provider} key=${storageKey}`);

    switch (this.config.provider) {
      case 'local':
        return this.uploadToLocal(localPath, storageKey);
      case 's3':
        return this.uploadToS3(localPath, storageKey);
      case 'gcs':
        return this.uploadToGCS(localPath, storageKey);
      case 'azure':
        return this.uploadToAzure(localPath, storageKey);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  //  Upload buffer directly to storage
  async uploadBuffer(buffer: Buffer, storageKey: string, mimeType?: string): Promise<UploadResult> {
    this.logger.debug(`[uploadBuffer] provider=${this.config.provider} key=${storageKey} size=${buffer.length}`);

    switch (this.config.provider) {
      case 'local':
        return this.uploadBufferToLocal(buffer, storageKey);
      case 's3':
        return this.uploadBufferToS3(buffer, storageKey, mimeType);
      case 'gcs':
        return this.uploadBufferToGCS(buffer, storageKey, mimeType);
      case 'azure':
        return this.uploadBufferToAzure(buffer, storageKey, mimeType);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  //  Download a file from storage to local path
  async downloadFile(storageKey: string, localPath: string): Promise<void> {
    this.logger.debug(`[downloadFile] provider=${this.config.provider} key=${storageKey}`);

    switch (this.config.provider) {
      case 'local':
        return this.downloadFromLocal(storageKey, localPath);
      case 's3':
        return this.downloadFromS3(storageKey, localPath);
      case 'gcs':
        return this.downloadFromGCS(storageKey, localPath);
      case 'azure':
        return this.downloadFromAzure(storageKey, localPath);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  //  Get public URL for a storage key
  getPublicUrl(storageKey: string): string {
    switch (this.config.provider) {
      case 'local':
        return `/storage/${storageKey}`;
      case 's3':
        if (this.config.endpoint) {
          return `${this.config.endpoint}/${this.config.bucket}/${storageKey}`;
        }
        return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${storageKey}`;
      case 'gcs':
        return `https://storage.googleapis.com/${this.config.bucket}/${storageKey}`;
      case 'azure':
        return `https://${this.config.bucket}.blob.core.windows.net/${storageKey}`;
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  //  Delete a file from storage
  async deleteFile(storageKey: string): Promise<void> {
    this.logger.debug(`[deleteFile] provider=${this.config.provider} key=${storageKey}`);

    switch (this.config.provider) {
      case 'local':
        return this.deleteFromLocal(storageKey);
      case 's3':
        return this.deleteFromS3(storageKey);
      case 'gcs':
        return this.deleteFromGCS(storageKey);
      case 'azure':
        return this.deleteFromAzure(storageKey);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  // ============================================
  // Local Storage Implementation
  // ============================================

  private async uploadToLocal(localPath: string, storageKey: string): Promise<UploadResult> {
    const destPath = join(this.localBasePath, storageKey);
    const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    const buffer = readFileSync(localPath);
    writeFileSync(destPath, buffer);

    return {
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
      size: buffer.length,
    };
  }

  private async uploadBufferToLocal(buffer: Buffer, storageKey: string): Promise<UploadResult> {
    const destPath = join(this.localBasePath, storageKey);
    const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
    if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });

    writeFileSync(destPath, buffer);

    return {
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
      size: buffer.length,
    };
  }

  private async downloadFromLocal(storageKey: string, localPath: string): Promise<void> {
    const srcPath = join(this.localBasePath, storageKey);
    const buffer = readFileSync(srcPath);
    writeFileSync(localPath, buffer);
  }

  private async deleteFromLocal(storageKey: string): Promise<void> {
    const filePath = join(this.localBasePath, storageKey);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  // ============================================
  // S3 / S3-Compatible Storage (MinIO, etc.)
  // ============================================

  private async uploadToS3(localPath: string, storageKey: string): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const fileStream = createReadStream(localPath);
    const buffer = readFileSync(localPath);

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      Body: fileStream,
      ContentLength: buffer.length,
    });

    await this.s3Client.send(command);

    this.logger.debug(`[uploadToS3] key=${storageKey} size=${buffer.length}`);

    return {
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
      size: buffer.length,
    };
  }

  private async uploadBufferToS3(buffer: Buffer, storageKey: string, mimeType?: string): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.length,
    });

    await this.s3Client.send(command);

    this.logger.debug(`[uploadBufferToS3] key=${storageKey} size=${buffer.length}`);

    return {
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
      size: buffer.length,
    };
  }

  private async downloadFromS3(storageKey: string, localPath: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error('No data received from S3');
    }

    // Convert response body to buffer
    const bodyContents = await this.streamToBuffer(response.Body as Readable);
    writeFileSync(localPath, bodyContents);

    this.logger.debug(`[downloadFromS3] key=${storageKey} to ${localPath}`);
  }

  private async deleteFromS3(storageKey: string): Promise<void> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: storageKey,
    });

    await this.s3Client.send(command);

    this.logger.debug(`[deleteFromS3] key=${storageKey}`);
  }

  //  Helper: Convert stream to buffer
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  //  Check if a file exists in S3
  async existsInS3(storageKey: string): Promise<boolean> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if ((error as { name: string }).name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  // ============================================
  // Google Cloud Storage
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadToGCS(_localPath: string, _storageKey: string): Promise<UploadResult> {
    // TODO: Implement GCS upload using @google-cloud/storage
    this.logger.warn('GCS upload not yet implemented. Install @google-cloud/storage and implement.');
    throw new Error('GCS storage not implemented. Set STORAGE_PROVIDER=local for development.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadBufferToGCS(_buffer: Buffer, _storageKey: string, _mimeType?: string): Promise<UploadResult> {
    // TODO: Implement GCS buffer upload
    this.logger.warn('GCS buffer upload not yet implemented.');
    throw new Error('GCS storage not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async downloadFromGCS(_storageKey: string, _localPath: string): Promise<void> {
    // TODO: Implement GCS download
    this.logger.warn('GCS download not yet implemented.');
    throw new Error('GCS storage not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteFromGCS(_storageKey: string): Promise<void> {
    // TODO: Implement GCS delete
    this.logger.warn('GCS delete not yet implemented.');
    throw new Error('GCS storage not implemented.');
  }

  // ============================================
  // Azure Blob Storage
  // ============================================

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadToAzure(_localPath: string, _storageKey: string): Promise<UploadResult> {
    // TODO: Implement Azure upload using @azure/storage-blob
    this.logger.warn('Azure upload not yet implemented. Install @azure/storage-blob and implement.');
    throw new Error('Azure storage not implemented. Set STORAGE_PROVIDER=local for development.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async uploadBufferToAzure(_buffer: Buffer, _storageKey: string, _mimeType?: string): Promise<UploadResult> {
    // TODO: Implement Azure buffer upload
    this.logger.warn('Azure buffer upload not yet implemented.');
    throw new Error('Azure storage not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async downloadFromAzure(_storageKey: string, _localPath: string): Promise<void> {
    // TODO: Implement Azure download
    this.logger.warn('Azure download not yet implemented.');
    throw new Error('Azure storage not implemented.');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private async deleteFromAzure(_storageKey: string): Promise<void> {
    // TODO: Implement Azure delete
    this.logger.warn('Azure delete not yet implemented.');
    throw new Error('Azure storage not implemented.');
  }
}


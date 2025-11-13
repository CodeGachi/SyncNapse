import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Readable } from 'node:stream';
import { StreamingBlobPayloadOutputTypes } from '@smithy/types';
import { PrismaService } from '../db/prisma.service';

export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  bucket?: string;
  region?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrl?: string;
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
  private readonly encryptionKey?: Buffer;
  private readonly algorithm = 'aes-256-gcm';
  private s3Client?: S3Client;

  constructor(private readonly prisma: PrismaService) {
    // Support both old MINIO_* env vars and new STORAGE_* env vars for backward compatibility
    const endpoint = process.env.STORAGE_ENDPOINT || process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const region = process.env.STORAGE_REGION || process.env.MINIO_REGION || 'us-east-1';
    const bucket = process.env.STORAGE_BUCKET || process.env.MINIO_BUCKET || 'syncnapse-files';
    const publicUrl = process.env.STORAGE_PUBLIC_URL || process.env.MINIO_PUBLIC_URL || endpoint;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY;

    this.config = {
      provider: (process.env.STORAGE_PROVIDER as StorageConfig['provider']) || 'local',
      bucket,
      region,
      endpoint,
      accessKeyId,
      secretAccessKey,
      publicUrl,
    };

    this.localBasePath = process.env.STORAGE_LOCAL_PATH || join(process.cwd(), 'var', 'storage');
    this.logger.log(`Storage provider: ${this.config.provider}`);

    // Initialize encryption key if provided (for S3 provider)
    if (this.config.provider === 's3') {
      const encryptionKeyHex = process.env.STORAGE_ENCRYPTION_KEY;
      if (encryptionKeyHex) {
        this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
        if (this.encryptionKey.length !== 32) {
          throw new Error('STORAGE_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
        }
        this.logger.log('[StorageService] ✅ Encryption key loaded from environment');
      } else {
        // Generate a random key for development (WARNING: use proper key in production!)
        this.logger.warn('[StorageService] ⚠️ No STORAGE_ENCRYPTION_KEY found, generating random key (DEV ONLY!)');
        this.encryptionKey = randomBytes(32);
        this.logger.warn(`[StorageService] 🔑 Generated key (save this!): ${this.encryptionKey.toString('hex')}`);
      }
    }

    if (this.config.provider === 'local') {
      this.ensureLocalDirs();
    } else if (this.config.provider === 's3') {
      this.initializeS3Client();
    }
  }

  private initializeS3Client() {
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      throw new Error('S3 credentials not provided. Set STORAGE_ACCESS_KEY_ID and STORAGE_SECRET_ACCESS_KEY (or MINIO_ACCESS_KEY and MINIO_SECRET_KEY)');
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

  // ============================================
  // Helper Methods
  // ============================================

  // Get user email from userId
  private async getUserEmail(userId: string): Promise<string> {
    this.logger.debug(`[getUserEmail] Getting email for userId: ${userId}`);
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user) {
      this.logger.error(`[getUserEmail] User not found: ${userId}`);
      throw new NotFoundException('User not found');
    }

    this.logger.debug(`[getUserEmail] Found email: ${user.email}`);
    return user.email;
  }

  // ============================================
  // Encryption Methods
  // ============================================

  // Encrypt buffer using AES-256-GCM
  // Returns: iv (12 bytes) + authTag (16 bytes) + encrypted data
  private encrypt(buffer: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    const iv = randomBytes(12); // 12 bytes for GCM
    const cipher = createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(buffer),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Concatenate: iv + authTag + encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  }

  // Decrypt buffer using AES-256-GCM
  // Expects: iv (12 bytes) + authTag (16 bytes) + encrypted data
  private decrypt(encryptedBuffer: Buffer): Buffer {
    if (!this.encryptionKey) {
      throw new Error('Encryption key not initialized');
    }

    if (encryptedBuffer.length < 28) {
      throw new Error('Invalid encrypted data: too short');
    }
    
    // Extract iv, authTag, and encrypted data
    const iv = encryptedBuffer.slice(0, 12);
    const authTag = encryptedBuffer.slice(12, 28);
    const encrypted = encryptedBuffer.slice(28);
    
    const decipher = createDecipheriv(this.algorithm, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);
    
    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
  }

  // ============================================
  // Public API Methods
  // ============================================

  //  Upload a file to storage (overloads)
  //  Upload Multer file
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    noteId: string,
    fileType?: 'notes' | 'typing' | 'audio' | 'pdf',
  ): Promise<{ url: string; key: string }>;
  //  Upload from local path
  async uploadFile(localPath: string, storageKey: string): Promise<UploadResult>;
  //  Implementation
  async uploadFile(
    fileOrPath: Express.Multer.File | string,
    userIdOrStorageKey: string,
    noteId?: string,
    fileType?: 'notes' | 'typing' | 'audio' | 'pdf',
  ): Promise<{ url: string; key: string } | UploadResult> {
    // Check if first parameter is Multer file
    if (typeof fileOrPath !== 'string' && 'buffer' in fileOrPath) {
      const file = fileOrPath as Express.Multer.File;
      const userId = userIdOrStorageKey;
      const noteIdValue = noteId!;
      const type = fileType || 'notes';

      // Get user email to use as folder name
      const userEmail = await this.getUserEmail(userId);

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${randomUUID()}.${fileExtension}`;
      const key = `users/${userEmail}/notes/${noteIdValue}/${type}/${fileName}`;

      this.logger.debug(`Uploading file: ${file.originalname} -> ${key}`);

      if (this.config.provider === 's3' && this.s3Client) {
        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            originalName: file.originalname,
            noteId: noteIdValue,
            userId,
            fileType: type,
          },
        });

        await this.s3Client.send(command);

        const url = `${this.config.publicUrl}/${this.config.bucket}/${key}`;
        this.logger.log(`File uploaded successfully: ${url}`);

        return { url, key };
      } else if (this.config.provider === 'local') {
        const result = await this.uploadBufferToLocal(file.buffer, key);
        return {
          url: result.publicUrl || this.getPublicUrl(key),
          key: result.storageKey,
        };
      } else {
        throw new Error(`Upload from Multer file not supported for provider: ${this.config.provider}`);
      }
    } else {
      // Original signature: uploadFile(localPath, storageKey)
      const localPath = fileOrPath as string;
      const storageKey = userIdOrStorageKey;
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
        if (this.config.endpoint && this.config.publicUrl) {
          return `${this.config.publicUrl}/${this.config.bucket}/${storageKey}`;
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

  //  Check if a file exists in storage
  async fileExists(storageKey: string): Promise<boolean> {
    this.logger.debug(`[fileExists] provider=${this.config.provider} key=${storageKey}`);

    switch (this.config.provider) {
      case 'local':
        const localPath = join(this.localBasePath, storageKey);
        return existsSync(localPath);
      case 's3':
        return this.existsInS3(storageKey);
      case 'gcs':
        // TODO: Implement GCS file exists check
        throw new Error(`fileExists not supported for provider: ${this.config.provider}`);
      case 'azure':
        // TODO: Implement Azure file exists check
        throw new Error(`fileExists not supported for provider: ${this.config.provider}`);
      default:
        throw new Error(`Unsupported storage provider: ${this.config.provider}`);
    }
  }

  //  List folders (directories) in a given path
  async listFolders(prefix: string): Promise<string[]> {
    this.logger.debug(`[listFolders] provider=${this.config.provider} prefix=${prefix}`);

    if (this.config.provider === 's3' && this.s3Client) {
      try {
        const command = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: prefix,
          Delimiter: '/',
        });

        const response = await this.s3Client.send(command);
        
        // CommonPrefixes contains the "subdirectories"
        const folders = (response.CommonPrefixes || [])
          .map(p => {
            if (!p.Prefix) return null;
            // Extract folder name from prefix
            const folderName = p.Prefix.replace(prefix, '').replace(/\/$/, '');
            return folderName;
          })
          .filter((name): name is string => name !== null && name !== '');

        this.logger.debug(`[listFolders] Found ${folders.length} folders in ${prefix}`);
        return folders;
      } catch (error) {
        this.logger.error(`[listFolders] Failed to list folders:`, error);
        return [];
      }
    } else if (this.config.provider === 'local') {
      const { readdirSync, statSync } = await import('node:fs');
      const fullPath = join(this.localBasePath, prefix);
      
      if (!existsSync(fullPath)) {
        return [];
      }

      const entries = readdirSync(fullPath);
      const folders = entries.filter(entry => {
        const entryPath = join(fullPath, entry);
        return statSync(entryPath).isDirectory();
      });

      this.logger.debug(`[listFolders] Found ${folders.length} folders in ${prefix}`);
      return folders;
    } else {
      throw new Error(`listFolders not supported for provider: ${this.config.provider}`);
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

  // Get signed URL for S3 (only works with S3 provider)
  async getSignedUrl(key: string): Promise<string> {
    if (this.config.provider !== 's3' || !this.s3Client) {
      throw new Error('getSignedUrl is only available for S3 provider');
    }

    // MinIO already has Content-Type set during upload, so we don't need to override it
    // Using ResponseContentType in signed URL can cause 403 errors with MinIO
    const command = new GetObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
    });

    this.logger.debug(`Generating signed URL for key: ${key}`);
    
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    
    // Replace internal endpoint with public URL if configured
    if (this.config.publicUrl && this.config.endpoint) {
      const urlObj = new URL(url);
      const publicUrlObj = new URL(this.config.publicUrl);
      urlObj.host = publicUrlObj.host;
      urlObj.protocol = publicUrlObj.protocol;
      const publicSignedUrl = urlObj.toString();
      this.logger.debug(`Generated signed URL: ${publicSignedUrl.substring(0, 150)}...`);
      return publicSignedUrl;
    }
    
    this.logger.debug(`Generated signed URL: ${url.substring(0, 150)}...`);
    return url;
  }

  // Get file stream (with encryption support for S3)
  async getFileStream(key: string): Promise<{ 
    body: StreamingBlobPayloadOutputTypes | Buffer; 
    contentType?: string; 
    contentLength?: number;
  }> {
    this.logger.debug(`[getFileStream] Fetching file: ${key}`);

    if (this.config.provider === 's3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      });

      try {
        const response = await this.s3Client.send(command);
        
        this.logger.debug(`[getFileStream] ✅ File found:`, {
          contentType: response.ContentType,
          contentLength: response.ContentLength,
          encrypted: response.Metadata?.encrypted,
        });

        // Check if response has body
        if (!response.Body) {
          throw new Error('No body in storage response');
        }

        // Check if file is encrypted
        const isEncrypted = response.Metadata?.encrypted === 'true' || key.endsWith('.enc');
        
        if (isEncrypted && this.encryptionKey) {
          this.logger.debug(`[getFileStream] 🔓 File is encrypted, decrypting...`);
          
          // Read entire encrypted file into buffer
          const encryptedBuffer = await response.Body.transformToByteArray();
          this.logger.debug(`[getFileStream] Read ${encryptedBuffer.length} encrypted bytes`);
          
          // Decrypt
          const decryptedBuffer = this.decrypt(Buffer.from(encryptedBuffer));
          this.logger.log(`[getFileStream] ✅ Decrypted: ${encryptedBuffer.length} bytes → ${decryptedBuffer.length} bytes`);
          
          // Return decrypted buffer as body
          return {
            body: decryptedBuffer,
            contentType: response.Metadata?.originalContentType || 'application/octet-stream',
            contentLength: decryptedBuffer.length,
          };
        }
        
        // Not encrypted, return as is
        return {
          body: response.Body,
          contentType: response.ContentType,
          contentLength: response.ContentLength,
        };
      } catch (error) {
        this.logger.error(`[getFileStream] ❌ Failed to get file:`, error);
        throw error;
      }
    } else if (this.config.provider === 'local') {
      const filePath = join(this.localBasePath, key);
      if (!existsSync(filePath)) {
        throw new Error(`File not found: ${key}`);
      }
      const buffer = readFileSync(filePath);
      return {
        body: buffer,
        contentType: 'application/octet-stream',
        contentLength: buffer.length,
      };
    } else {
      throw new Error(`getFileStream not supported for provider: ${this.config.provider}`);
    }
  }

  // Upload audio chunk for transcription session
  async uploadAudioChunk(
    buffer: Buffer,
    userId: string,
    sessionId: string,
    chunkIndex: number,
    fileExtension: string,
  ): Promise<{ url: string; key: string }> {
    // Get user email to use as folder name
    const userEmail = await this.getUserEmail(userId);

    const fileName = `chunk_${chunkIndex.toString().padStart(4, '0')}.${fileExtension}`;
    const key = `users/${userEmail}/transcription/${sessionId}/audio/${fileName}`;

    this.logger.debug(`[uploadAudioChunk] Uploading: ${key} (${buffer.length} bytes)`);

    if (this.config.provider === 's3' && this.s3Client) {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
        Body: buffer,
        ContentType: 'audio/webm',
        ContentDisposition: 'inline',
        Metadata: {
          userId,
          sessionId,
          chunkIndex: chunkIndex.toString(),
        },
      });

      await this.s3Client.send(command);

      const url = `${this.config.publicUrl}/${this.config.bucket}/${key}`;
      this.logger.log(`[uploadAudioChunk] ✅ Uploaded: ${key}`);

      return { url, key };
    } else if (this.config.provider === 'local') {
      const result = await this.uploadBufferToLocal(buffer, key);
      return {
        url: result.publicUrl || this.getPublicUrl(key),
        key: result.storageKey,
      };
    } else {
      throw new Error(`uploadAudioChunk not supported for provider: ${this.config.provider}`);
    }
  }

  // Upload full audio file for transcription session (ENCRYPTED)
  async uploadFullAudio(
    buffer: Buffer,
    userId: string,
    sessionId: string,
    fileExtension: string,
    noteId?: string,
  ): Promise<{ url: string; key: string }> {
    // Get user email to use as folder name
    const userEmail = await this.getUserEmail(userId);

    // Determine storage path based on noteId availability
    const fileName = `full_audio.${fileExtension}.enc`; // .enc suffix indicates encrypted
    const key = noteId 
      ? `notes/${noteId}/audio/${sessionId}/${fileName}`  // Note-based path
      : `users/${userEmail}/transcription/${sessionId}/${fileName}`;  // User-based path (fallback)

    this.logger.debug(`[uploadFullAudio] Uploading: ${key} (${buffer.length} bytes) [noteId: ${noteId || 'none'}]`);

    if (this.config.provider === 's3' && this.s3Client && this.encryptionKey) {
      this.logger.debug(`[uploadFullAudio] 🔒 Encrypting audio before upload...`);

      try {
        // Encrypt the audio buffer
        const encryptedBuffer = this.encrypt(buffer);
        this.logger.debug(`[uploadFullAudio] ✅ Encrypted: ${buffer.length} bytes → ${encryptedBuffer.length} bytes`);

        const command = new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: key,
          Body: encryptedBuffer, // Upload encrypted data
          ContentType: 'application/octet-stream', // Encrypted data, not audio/webm
          ContentDisposition: 'inline',
          CacheControl: 'public, max-age=31536000',
          Metadata: {
            userId,
            sessionId,
            type: 'full_audio',
            encrypted: 'true', // Mark as encrypted
            originalSize: buffer.length.toString(),
            originalContentType: 'audio/webm',
          },
        });

        await this.s3Client.send(command);

        const url = `${this.config.publicUrl}/${this.config.bucket}/${key}`;
        this.logger.log(`[uploadFullAudio] ✅ Uploaded ENCRYPTED audio: ${key}`);
        this.logger.log(`[uploadFullAudio] 🔒 Original: ${buffer.length} bytes, Encrypted: ${encryptedBuffer.length} bytes`);

        return { url, key };
      } catch (error) {
        this.logger.error(`[uploadFullAudio] ❌ Failed to upload: ${key}`, error);
        throw error;
      }
    } else if (this.config.provider === 'local') {
      // For local storage, we can still encrypt if encryption key is available
      if (this.encryptionKey) {
        const encryptedBuffer = this.encrypt(buffer);
        const result = await this.uploadBufferToLocal(encryptedBuffer, key);
        return {
          url: result.publicUrl || this.getPublicUrl(key),
          key: result.storageKey,
        };
      } else {
        // No encryption, just upload normally
        const result = await this.uploadBufferToLocal(buffer, key.replace('.enc', ''));
        return {
          url: result.publicUrl || this.getPublicUrl(result.storageKey),
          key: result.storageKey,
        };
      }
    } else {
      throw new Error(`uploadFullAudio not supported for provider: ${this.config.provider}`);
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
    
    // Check if file is encrypted
    const isEncrypted = response.Metadata?.encrypted === 'true' || storageKey.endsWith('.enc');
    if (isEncrypted && this.encryptionKey) {
      this.logger.debug(`[downloadFromS3] 🔓 File is encrypted, decrypting...`);
      const decryptedBuffer = this.decrypt(bodyContents);
      writeFileSync(localPath, decryptedBuffer);
    } else {
      writeFileSync(localPath, bodyContents);
    }

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

  //  Create a folder in storage
  //  Note: S3/MinIO doesn't have real folders - they're created automatically when files are uploaded
  //  For local storage, we create actual directories
  async createFolder(folderPath: string): Promise<void> {
    this.logger.debug(`[createFolder] Creating folder: ${folderPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // S3/MinIO: Folders are virtual and created automatically when files are uploaded
      // No need to create placeholder files
      this.logger.debug(`[createFolder] ✅ S3 folder will be created automatically on file upload: ${folderPath}`);
    } else if (this.config.provider === 'local') {
      // For local storage, actually create the directory
      const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
      const fullPath = join(this.localBasePath, normalizedPath);
      
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
        this.logger.debug(`[createFolder] ✅ Created local folder: ${fullPath}`);
      }
    }
  }

  //  Delete a folder in storage
  //  Note: S3/MinIO folders are virtual - actual file deletion should be handled separately
  async deleteFolder(folderPath: string): Promise<void> {
    this.logger.debug(`[deleteFolder] Deleting folder: ${folderPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // S3/MinIO: No need to delete anything - folders are virtual
      // Files in the folder should be deleted separately
      this.logger.debug(`[deleteFolder] S3 folder is virtual, no deletion needed: ${folderPath}`);
    } else if (this.config.provider === 'local') {
      // For local storage, we don't delete the folder if it contains files
      const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
      const fullPath = join(this.localBasePath, normalizedPath);
      
      this.logger.debug(`[deleteFolder] Local folder not deleted (may contain files): ${fullPath}`);
    }
  }

  //  Rename a file in storage (copy + delete)
  async renameFile(oldKey: string, newKey: string): Promise<void> {
    this.logger.debug(`[renameFile] Renaming file: ${oldKey} -> ${newKey}`);

    if (this.config.provider === 's3' && this.s3Client) {
      try {
        // Copy object to new key (URL encode the source path)
        const encodedOldKey = encodeURIComponent(oldKey);
        const copyCommand = new CopyObjectCommand({
          Bucket: this.config.bucket,
          CopySource: `${this.config.bucket}/${encodedOldKey}`,
          Key: newKey,
        });
        
        await this.s3Client.send(copyCommand);
        this.logger.debug(`[renameFile] ✅ Copied: ${oldKey} -> ${newKey}`);
        
        // Delete old object
        const deleteCommand = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: oldKey,
        });
        
        await this.s3Client.send(deleteCommand);
        this.logger.log(`[renameFile] ✅ Renamed file: ${oldKey} -> ${newKey}`);
      } catch (error) {
        this.logger.error(`[renameFile] ❌ Failed to rename file:`, error);
        throw error;
      }
    } else if (this.config.provider === 'local') {
      // For local storage, rename the file
      const oldFullPath = join(this.localBasePath, oldKey);
      const newFullPath = join(this.localBasePath, newKey);
      
      if (existsSync(oldFullPath)) {
        renameSync(oldFullPath, newFullPath);
        this.logger.log(`[renameFile] ✅ Renamed local file: ${oldFullPath} -> ${newFullPath}`);
      } else {
        this.logger.warn(`[renameFile] Local file not found: ${oldFullPath}`);
      }
    }
  }

  //  Delete a folder and all its contents recursively
  async deleteFolderRecursively(folderPath: string): Promise<void> {
    this.logger.debug(`[deleteFolderRecursively] Deleting folder: ${folderPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      try {
        const folderPrefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
        
        this.logger.debug(`[deleteFolderRecursively] Listing objects with prefix: ${folderPrefix}`);
        
        // List all objects with this prefix
        const listCommand = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: folderPrefix,
        });
        
        const listResponse = await this.s3Client.send(listCommand);
        const objects = listResponse.Contents || [];
        
        if (objects.length === 0) {
          this.logger.warn(`[deleteFolderRecursively] No objects found with prefix: ${folderPrefix}`);
          return;
        }
        
        this.logger.debug(`[deleteFolderRecursively] Found ${objects.length} objects to delete`);
        
        // Delete each object
        for (const obj of objects) {
          if (!obj.Key) continue;
          
          this.logger.debug(`[deleteFolderRecursively] Deleting: ${obj.Key}`);
          
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: obj.Key,
          });
          
          await this.s3Client.send(deleteCommand);
        }
        
        this.logger.log(`[deleteFolderRecursively] ✅ Successfully deleted ${objects.length} objects from ${folderPath}`);
      } catch (error) {
        this.logger.error(`[deleteFolderRecursively] ❌ Failed to delete folder:`, error);
        throw error;
      }
    } else if (this.config.provider === 'local') {
      const { rmSync } = await import('node:fs');
      const fullPath = join(this.localBasePath, folderPath);
      
      if (existsSync(fullPath)) {
        rmSync(fullPath, { recursive: true, force: true });
        this.logger.log(`[deleteFolderRecursively] ✅ Deleted local folder: ${fullPath}`);
      } else {
        this.logger.warn(`[deleteFolderRecursively] Local folder not found: ${fullPath}`);
      }
    } else {
      throw new Error(`deleteFolderRecursively not supported for provider: ${this.config.provider}`);
    }
  }

  //  Rename/move a folder in storage
  //  Note: S3/MinIO folders are virtual - no action needed
  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    this.logger.debug(`[renameFolder] Renaming folder: ${oldPath} -> ${newPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // S3/MinIO: List all objects with oldPath prefix, copy to newPath, and delete old ones
      try {
        const oldPrefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
        const newPrefix = newPath.endsWith('/') ? newPath : `${newPath}/`;
        
        this.logger.debug(`[renameFolder] Listing objects with prefix: ${oldPrefix}`);
        
        // List all objects with old prefix
        const listCommand = new ListObjectsV2Command({
          Bucket: this.config.bucket,
          Prefix: oldPrefix,
        });
        
        const listResponse = await this.s3Client.send(listCommand);
        const objects = listResponse.Contents || [];
        
        if (objects.length === 0) {
          this.logger.warn(`[renameFolder] No objects found with prefix: ${oldPrefix}`);
          return;
        }
        
        this.logger.debug(`[renameFolder] Found ${objects.length} objects to rename`);
        
        // Copy each object to new path and delete old one
        for (const obj of objects) {
          if (!obj.Key) continue;
          
          const relativePath = obj.Key.substring(oldPrefix.length);
          const newKey = `${newPrefix}${relativePath}`;
          
          this.logger.debug(`[renameFolder] Copying: ${obj.Key} -> ${newKey}`);
          
          // Copy object to new path (URL encode the source path)
          const encodedObjKey = encodeURIComponent(obj.Key);
          const copyCommand = new CopyObjectCommand({
            Bucket: this.config.bucket,
            CopySource: `${this.config.bucket}/${encodedObjKey}`,
            Key: newKey,
          });
          
          await this.s3Client.send(copyCommand);
          
          // Delete old object
          const deleteCommand = new DeleteObjectCommand({
            Bucket: this.config.bucket,
            Key: obj.Key,
          });
          
          await this.s3Client.send(deleteCommand);
          
          this.logger.debug(`[renameFolder] ✅ Renamed: ${obj.Key} -> ${newKey}`);
        }
        
        this.logger.log(`[renameFolder] ✅ Successfully renamed ${objects.length} objects from ${oldPath} to ${newPath}`);
      } catch (error) {
        this.logger.error(`[renameFolder] ❌ Failed to rename folder:`, error);
        throw error;
      }
    } else if (this.config.provider === 'local') {
      // For local storage, rename the directory
      const oldFullPath = join(this.localBasePath, oldPath);
      const newFullPath = join(this.localBasePath, newPath);
      
      if (existsSync(oldFullPath)) {
        renameSync(oldFullPath, newFullPath);
        this.logger.log(`[renameFolder] ✅ Renamed local folder: ${oldFullPath} -> ${newFullPath}`);
      } else {
        this.logger.warn(`[renameFolder] Local folder not found: ${oldFullPath}`);
      }
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


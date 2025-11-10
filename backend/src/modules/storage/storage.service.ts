import { Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync, mkdirSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { Readable } from 'node:stream';
import { StreamingBlobPayloadOutputTypes } from '@smithy/types';

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

  constructor() {
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

      const fileExtension = file.originalname.split('.').pop();
      const fileName = `${randomUUID()}.${fileExtension}`;
      const key = `users/${userId}/notes/${noteIdValue}/${type}/${fileName}`;

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
    const fileName = `chunk_${chunkIndex.toString().padStart(4, '0')}.${fileExtension}`;
    const key = `users/${userId}/transcription/${sessionId}/audio/${fileName}`;

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
  ): Promise<{ url: string; key: string }> {
    const fileName = `full_audio.${fileExtension}.enc`; // .enc suffix indicates encrypted
    const key = `users/${userId}/transcription/${sessionId}/${fileName}`;

    this.logger.debug(`[uploadFullAudio] Uploading: ${key} (${buffer.length} bytes)`);

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

  //  Create a folder in storage (by uploading a placeholder file)
  //  Note: S3 doesn't have "folders" - they're implied by object key prefixes
  //  We create a .folder placeholder file to ensure the folder exists
  async createFolder(folderPath: string): Promise<void> {
    this.logger.debug(`[createFolder] Creating folder: ${folderPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // Ensure folder path ends with /
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      
      // Create a .folder placeholder file
      const placeholderKey = `${normalizedPath}.folder`;
      
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: placeholderKey,
        Body: Buffer.from(''), // Empty file
        ContentType: 'application/x-directory',
        Metadata: {
          type: 'folder_placeholder',
        },
      });

      await this.s3Client.send(command);
      this.logger.debug(`[createFolder] ✅ Created folder placeholder: ${placeholderKey}`);
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

  //  Delete a folder in storage (remove placeholder and all contents)
  async deleteFolder(folderPath: string): Promise<void> {
    this.logger.debug(`[deleteFolder] Deleting folder: ${folderPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // Note: This only deletes the placeholder. 
      // Actual file deletion should be handled separately
      const normalizedPath = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
      const placeholderKey = `${normalizedPath}.folder`;
      
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: placeholderKey,
        });
        await this.s3Client.send(command);
        this.logger.debug(`[deleteFolder] ✅ Deleted folder placeholder: ${placeholderKey}`);
      } catch (error) {
        this.logger.warn(`[deleteFolder] Failed to delete folder placeholder: ${placeholderKey}`, error);
      }
    } else if (this.config.provider === 'local') {
      // For local storage, we don't delete the folder if it contains files
      // This is just for consistency with S3 behavior
      const normalizedPath = folderPath.endsWith('/') ? folderPath.slice(0, -1) : folderPath;
      const fullPath = join(this.localBasePath, normalizedPath);
      
      this.logger.debug(`[deleteFolder] Local folder not deleted (may contain files): ${fullPath}`);
    }
  }

  //  Rename/move a folder in storage
  async renameFolder(oldPath: string, newPath: string): Promise<void> {
    this.logger.debug(`[renameFolder] Renaming folder: ${oldPath} -> ${newPath}`);

    if (this.config.provider === 's3' && this.s3Client) {
      // For S3, we need to update the placeholder
      const oldNormalized = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
      const newNormalized = newPath.endsWith('/') ? newPath : `${newPath}/`;
      
      const oldPlaceholder = `${oldNormalized}.folder`;
      const newPlaceholder = `${newNormalized}.folder`;
      
      // Create new placeholder
      await this.createFolder(newNormalized);
      
      // Delete old placeholder
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.config.bucket,
          Key: oldPlaceholder,
        });
        await this.s3Client.send(command);
        this.logger.debug(`[renameFolder] ✅ Renamed folder placeholder: ${oldPlaceholder} -> ${newPlaceholder}`);
      } catch (error) {
        this.logger.warn(`[renameFolder] Failed to delete old placeholder: ${oldPlaceholder}`, error);
      }
    } else if (this.config.provider === 'local') {
      // For local storage, we don't rename folders with files in them
      // Files should be moved separately
      this.logger.debug(`[renameFolder] Local folder rename skipped (files should be moved separately)`);
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


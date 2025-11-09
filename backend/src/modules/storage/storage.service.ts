import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly internalEndpoint: string;
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const region = process.env.MINIO_REGION || 'us-east-1';
    this.bucketName = process.env.MINIO_BUCKET || 'syncnapse-files';
    this.publicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
    this.internalEndpoint = endpoint;

    // Initialize encryption key (32 bytes for AES-256)
    const encryptionKeyHex = process.env.STORAGE_ENCRYPTION_KEY;
    if (!encryptionKeyHex) {
      // Generate a random key for development (WARNING: use proper key in production!)
      this.logger.warn('[StorageService] ⚠️ No STORAGE_ENCRYPTION_KEY found, generating random key (DEV ONLY!)');
      this.encryptionKey = randomBytes(32);
      this.logger.warn(`[StorageService] 🔑 Generated key (save this!): ${this.encryptionKey.toString('hex')}`);
    } else {
      this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex');
      if (this.encryptionKey.length !== 32) {
        throw new Error('STORAGE_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
      }
      this.logger.log('[StorageService] ✅ Encryption key loaded from environment');
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.logger.log(`Storage service initialized: internal=${endpoint} public=${this.publicUrl} bucket=${this.bucketName}`);
  }

  // Encrypt buffer using AES-256-GCM
  // Returns: iv (12 bytes) + authTag (16 bytes) + encrypted data
  private encrypt(buffer: Buffer): Buffer {
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

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    noteId: string,
    fileType: 'notes' | 'typing' | 'audio' | 'pdf' = 'notes',
  ): Promise<{ url: string; key: string }> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${randomUUID()}.${fileExtension}`;
    const key = `users/${userId}/notes/${noteId}/${fileType}/${fileName}`;

    this.logger.debug(`Uploading file: ${file.originalname} -> ${key}`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalName: file.originalname,
        noteId,
        userId,
        fileType,
      },
    });

    await this.s3Client.send(command);

    const url = `${this.publicUrl}/${this.bucketName}/${key}`;
    this.logger.log(`File uploaded successfully: ${url}`);

    return { url, key };
  }

  async getSignedUrl(key: string): Promise<string> {
    // MinIO already has Content-Type set during upload, so we don't need to override it
    // Using ResponseContentType in signed URL can cause 403 errors with MinIO
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    this.logger.debug(`Generating signed URL for key: ${key}`);
    
    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    const urlObj = new URL(url);
    const publicUrlObj = new URL(this.publicUrl);
    urlObj.host = publicUrlObj.host;
    urlObj.protocol = publicUrlObj.protocol;
    
    const publicSignedUrl = urlObj.toString();
    this.logger.debug(`Generated signed URL: ${publicSignedUrl.substring(0, 150)}...`);
    
    return publicSignedUrl;
  }

  async deleteFile(key: string): Promise<void> {
    this.logger.debug(`Deleting file: ${key}`);

    const command = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    await this.s3Client.send(command);
    this.logger.log(`File deleted successfully: ${key}`);
  }

  async getFileStream(key: string): Promise<{ 
    body: Buffer | Uint8Array | ReadableStream | Blob | string; 
    contentType?: string; 
    contentLength?: number;
  }> {
    this.logger.debug(`[getFileStream] Fetching file: ${key}`);
    
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
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
      
      if (isEncrypted) {
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
          contentType: 'audio/webm', // Original content type
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
  }

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

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'audio/webm',
      ContentDisposition: 'inline',
      ACL: 'public-read',
      Metadata: {
        userId,
        sessionId,
        chunkIndex: chunkIndex.toString(),
      },
    });

    await this.s3Client.send(command);

    const url = `${this.publicUrl}/${this.bucketName}/${key}`;
    this.logger.log(`[uploadAudioChunk] ✅ Uploaded: ${key}`);

    return { url, key };
  }

  // Upload full audio file for transcription session
  // Stores single audio file instead of chunks (ENCRYPTED)
  async uploadFullAudio(
    buffer: Buffer,
    userId: string,
    sessionId: string,
    fileExtension: string,
  ): Promise<{ url: string; key: string }> {
    const fileName = `full_audio.${fileExtension}.enc`; // .enc suffix indicates encrypted
    const key = `users/${userId}/transcription/${sessionId}/${fileName}`;

    this.logger.debug(`[uploadFullAudio] Uploading: ${key} (${buffer.length} bytes)`);
    this.logger.debug(`[uploadFullAudio] 🔒 Encrypting audio before upload...`);

    try {
      // Encrypt the audio buffer
      const encryptedBuffer = this.encrypt(buffer);
      this.logger.debug(`[uploadFullAudio] ✅ Encrypted: ${buffer.length} bytes → ${encryptedBuffer.length} bytes`);

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: encryptedBuffer, // Upload encrypted data
        ContentType: 'application/octet-stream', // Encrypted data, not audio/webm
        ContentDisposition: 'inline',
        CacheControl: 'public, max-age=31536000',
        ACL: 'public-read',
        Metadata: {
          userId,
          sessionId,
          type: 'full_audio',
          encrypted: 'true', // Mark as encrypted
          originalSize: buffer.length.toString(),
        },
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${this.bucketName}/${key}`;
      this.logger.log(`[uploadFullAudio] ✅ Uploaded ENCRYPTED audio: ${key}`);
      this.logger.log(`[uploadFullAudio] 🔒 Original: ${buffer.length} bytes, Encrypted: ${encryptedBuffer.length} bytes`);

      return { url, key };
    } catch (error) {
      this.logger.error(`[uploadFullAudio] ❌ Failed to upload: ${key}`, error);
      throw error;
    }
  }
}

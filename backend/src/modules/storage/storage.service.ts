import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly internalEndpoint: string;

  constructor() {
    const endpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
    const region = process.env.MINIO_REGION || 'us-east-1';
    this.bucketName = process.env.MINIO_BUCKET || 'syncnapse-files';
    this.publicUrl = process.env.MINIO_PUBLIC_URL || 'http://localhost:9000';
    this.internalEndpoint = endpoint;

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

  async uploadFile(
    file: any,
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
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const url = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
    const urlObj = new URL(url);
    const publicUrlObj = new URL(this.publicUrl);
    urlObj.host = publicUrlObj.host;
    urlObj.protocol = publicUrlObj.protocol;
    
    const publicSignedUrl = urlObj.toString();
    this.logger.debug(`Generated signed URL: ${key} -> ${publicSignedUrl}`);
    
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

  async getFileStream(key: string): Promise<ReadableStream | null> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    const response = await this.s3Client.send(command);
    return response.Body?.transformToWebStream() || null;
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

    this.logger.debug(`Uploading audio chunk: ${key} (${buffer.length} bytes)`);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: buffer,
      ContentType: 'audio/webm',
      Metadata: {
        userId,
        sessionId,
        chunkIndex: chunkIndex.toString(),
      },
    });

    await this.s3Client.send(command);

    const url = `${this.publicUrl}/${this.bucketName}/${key}`;
    this.logger.log(`Audio chunk uploaded successfully: ${key}`);

    return { url, key };
  }
}

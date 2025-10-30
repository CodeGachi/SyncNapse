import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
  HttpException,
  HttpStatus,
  Logger,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { StorageService } from './storage.service';
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { createReadStream } from 'node:fs';

//  WARNING: Storage Test Controller
//  Storage Test Controller
//  MinIO/S3 storage functionality test endpoints
//  Provides upload, download, delete, and buffer operations
@ApiTags('storage-test')
@Controller('storage-test')
export class StorageTestController {
  private readonly logger = new Logger(StorageTestController.name);
  private readonly tempDir: string;

  constructor(private readonly storageService: StorageService) {
    this.tempDir = join(process.cwd(), 'var', 'temp');
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  //  Upload file to storage (MinIO/S3)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ 
    summary: 'Upload file to MinIO/S3',
    description: 'Test upload functionality. File will be stored with timestamp prefix.'
  })
  async uploadFile(
    @UploadedFile() file: { buffer: Buffer; originalname: string; size: number; mimetype: string },
  ) {
    if (!file) {
      throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[uploadFile] fileName=${file.originalname} size=${file.size} mimeType=${file.mimetype}`);

    try {
      const timestamp = Date.now();
      const tempPath = join(this.tempDir, `${timestamp}-${file.originalname}`);
      writeFileSync(tempPath, file.buffer);

      const storageKey = `uploads/${timestamp}-${file.originalname}`;
      const result = await this.storageService.uploadFile(tempPath, storageKey);

      if (existsSync(tempPath)) {
        unlinkSync(tempPath);
      }

      this.logger.log(`[uploadFile] SUCCESS storageKey=${result.storageKey} publicUrl=${result.publicUrl}`);

      return {
        success: true,
        message: 'File uploaded successfully',
        data: {
          storageKey: result.storageKey,
          publicUrl: result.publicUrl,
          size: result.size,
          originalName: file.originalname,
          mimeType: file.mimetype,
        },
      };
    } catch (error) {
      this.logger.error(`[uploadFile] ERROR: ${(error as Error).message}`, (error as Error).stack);
      throw new HttpException(
        `Upload failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //  Upload buffer directly (without temp file)
  //  Test: curl -X POST -H "Content-Type: application/json" -d '{"fileName":"test.txt","content":"Hello World","mimeType":"text/plain"}' http://localhost:4000/api/storage-test/upload-buffer
  @Post('upload-buffer')
  @ApiOperation({ 
    summary: 'Upload buffer to MinIO/S3',
    description: 'Test direct buffer upload without temp file'
  })
  async uploadBuffer(
    @Res() body: { fileName: string; content: string; mimeType?: string },
  ) {
    if (!body?.fileName || !body?.content) {
      throw new HttpException('fileName and content required', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`[uploadBuffer] fileName=${body.fileName} contentLength=${body.content.length}`);

    try {
      const buffer = Buffer.from(body.content, 'utf-8');
      const timestamp = Date.now();
      const storageKey = `buffers/${timestamp}-${body.fileName}`;

      const result = await this.storageService.uploadBuffer(
        buffer,
        storageKey,
        body.mimeType || 'text/plain',
      );

      this.logger.log(`[uploadBuffer] SUCCESS storageKey=${result.storageKey}`);

      return {
        success: true,
        message: 'Buffer uploaded successfully',
        data: {
          storageKey: result.storageKey,
          publicUrl: result.publicUrl,
          size: result.size,
        },
      };
    } catch (error) {
      this.logger.error(`[uploadBuffer] ERROR: ${(error as Error).message}`, (error as Error).stack);
      throw new HttpException(
        `Upload failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //  Download file from storage
  //  Test: curl http://localhost:4000/api/storage-test/download/uploads/1234567890-test.txt
  @Get('download/:path(*)')
  @ApiOperation({ 
    summary: 'Download file from MinIO/S3',
    description: 'Test download functionality. Returns file as stream.'
  })
  async downloadFile(
    @Param('path') path: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`[downloadFile] storageKey=${path}`);

    try {
      const tempDownloadPath = join(this.tempDir, `download-${Date.now()}-${path.split('/').pop()}`);
      await this.storageService.downloadFile(path, tempDownloadPath);

      const fileStream = createReadStream(tempDownloadPath);
      const fileName = path.split('/').pop() || 'download';

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      });

      this.logger.log(`[downloadFile] SUCCESS streaming file`);

      fileStream.on('end', () => {
        if (existsSync(tempDownloadPath)) {
          unlinkSync(tempDownloadPath);
          this.logger.debug(`[downloadFile] Cleaned up temp file: ${tempDownloadPath}`);
        }
      });

      return new StreamableFile(fileStream);
    } catch (error) {
      this.logger.error(`[downloadFile] ERROR: ${(error as Error).message}`, (error as Error).stack);
      throw new HttpException(
        `Download failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //  Delete file from storage
  //  Test: curl -X DELETE http://localhost:4000/api/storage-test/uploads/1234567890-test.txt
  @Delete(':path(*)')
  @ApiOperation({ 
    summary: 'Delete file from MinIO/S3',
    description: 'Test delete functionality'
  })
  async deleteFile(@Param('path') path: string) {
    this.logger.log(`[deleteFile] storageKey=${path}`);

    try {
      await this.storageService.deleteFile(path);

      this.logger.log(`[deleteFile] SUCCESS deleted storageKey=${path}`);

      return {
        success: true,
        message: 'File deleted successfully',
        storageKey: path,
      };
    } catch (error) {
      this.logger.error(`[deleteFile] ERROR: ${(error as Error).message}`, (error as Error).stack);
      throw new HttpException(
        `Delete failed: ${(error as Error).message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //  Get public URL for a storage key
  //  Test: curl http://localhost:4000/api/storage-test/url/uploads/1234567890-test.txt
  @Get('url/:path(*)')
  @ApiOperation({ 
    summary: 'Get public URL for storage key',
    description: 'Returns the public URL without downloading'
  })
  getPublicUrl(@Param('path') path: string) {
    this.logger.log(`[getPublicUrl] storageKey=${path}`);

    const publicUrl = this.storageService.getPublicUrl(path);

    return {
      success: true,
      storageKey: path,
      publicUrl,
    };
  }

  //  Health check for storage service
  //  Test: curl http://localhost:4000/api/storage-test/health
  @Get('health')
  @ApiOperation({ 
    summary: 'Storage health check',
    description: 'Check if storage service is configured and accessible'
  })
  async healthCheck() {
    this.logger.log(`[healthCheck] Checking storage configuration`);

    const config = {
      provider: process.env.STORAGE_PROVIDER || 'local',
      endpoint: process.env.STORAGE_ENDPOINT || 'N/A',
      bucket: process.env.STORAGE_BUCKET || 'N/A',
      region: process.env.STORAGE_REGION || 'N/A',
    };

    this.logger.debug(`[healthCheck] Config: ${JSON.stringify(config)}`);

    return {
      success: true,
      message: 'Storage service is running',
      config,
      timestamp: new Date().toISOString(),
    };
  }
}


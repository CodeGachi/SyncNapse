import { Body, Controller, Get, HttpException, HttpStatus, Logger, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);
  constructor(private readonly uploads: UploadsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('start')
  @ApiOperation({ summary: 'Start a new chunked upload' })
  async start(@Body() body: { fileName: string; mimeType?: string; totalChunks: number; totalSizeBytes?: number; checksumSha256?: string }) {
    if (!body?.fileName || !body?.totalChunks) throw new HttpException('fileName and totalChunks required', HttpStatus.BAD_REQUEST);
    return this.uploads.start(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/chunk')
  @UseInterceptors(FileInterceptor('chunk'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { index: { type: 'integer' }, chunk: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Upload a single chunk' })
  async chunk(@Param('id') id: string, @Query('index', ParseIntPipe) index: number, @UploadedFile() file: { buffer: Buffer; size: number }) {
    if (!file) throw new HttpException('chunk file required', HttpStatus.BAD_REQUEST);
    return this.uploads.saveChunk(id, index, file);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  @ApiOperation({ summary: 'Assemble chunks and complete upload' })
  async complete(@Param('id') id: string) {
    return this.uploads.complete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/status')
  @ApiOperation({ summary: 'Get upload status' })
  async status(@Param('id') id: string) {
    return this.uploads.status(id);
  }
}

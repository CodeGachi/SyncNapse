import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('files')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly filesService: FilesService) {}

  @Post()
  @ApiOperation({ summary: 'Upload a new file to a note' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        noteId: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async createFile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFileDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.filesService.createFile(userId, dto, file);
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file metadata' })
  async getFile(
    @CurrentUser('id') userId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.getFile(userId, fileId);
  }

  @Patch(':fileId')
  @ApiOperation({ summary: 'Update file (metadata or new version)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        isLatest: { type: 'boolean', nullable: true },
        file: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async updateFile(
    @CurrentUser('id') userId: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.filesService.updateFile(userId, fileId, dto, file);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete file (soft delete)' })
  async deleteFile(
    @CurrentUser('id') userId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.filesService.deleteFile(userId, fileId);
  }
}


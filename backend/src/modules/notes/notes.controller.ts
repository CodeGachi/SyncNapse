
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
  UploadedFiles,
  Logger,
  Query,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto, SavePageContentDto, SaveNoteContentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  private readonly logger = new Logger(NotesController.name);

  constructor(private readonly notesService: NotesService) {}
  @Get()
  async getNotes(
    @CurrentUser('id') userId: string,
    @Query('folderId') folderId?: string,
  ) {
    this.logger.debug(`[getNotes] userId=${userId} folderId=${folderId || 'all'}`);
    return this.notesService.getNotesByUser(userId, folderId);
  }

  @Get(':noteId/files')
  async getNoteFiles(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[getNoteFiles] userId=${userId} noteId=${noteId}`);
    return this.notesService.getFilesForNote(userId, noteId);
  }

  @Get(':noteId/files/:fileId/download')
  async downloadFile(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('fileId') fileId: string,
  ) {
    this.logger.debug(`[downloadFile] userId=${userId} noteId=${noteId} fileId=${fileId}`);
    return this.notesService.downloadFileAsBase64(userId, noteId, fileId);
  }

  @Get(':noteId')
  async getNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[getNote] userId=${userId} noteId=${noteId}`);
    return this.notesService.getNote(userId, noteId);
  }

  @Post()
  @UseInterceptors(FilesInterceptor('files', 10))
  async createNote(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateNoteDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    this.logger.debug(
      `[createNote] userId=${userId} title=${dto.title} folderId=${dto.folder_id} filesCount=${files?.length || 0}`,
    );
    return this.notesService.createNote(userId, dto, files || []);
  }

  @Patch(':noteId')
  async updateNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    this.logger.debug(`[updateNote] userId=${userId} noteId=${noteId}`);
    return this.notesService.updateNote(userId, noteId, dto);
  }

  @Delete(':noteId')
  async deleteNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[deleteNote] userId=${userId} noteId=${noteId}`);
    return this.notesService.deleteNote(userId, noteId);
  }

  // Page Content endpoints
  @Post(':noteId/pages/:pageNumber/content')
  async savePageContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('pageNumber') pageNumber: string,
    @Body() dto: SavePageContentDto,
  ) {
    const pageNum = parseInt(pageNumber, 10);
    this.logger.debug(`[savePageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNum} blocks=${dto.blocks.length}`);
    return this.notesService.savePageContent(userId, noteId, pageNum, dto.blocks);
  }

  @Get(':noteId/pages/:pageNumber/content')
  async getPageContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    const pageNum = parseInt(pageNumber, 10);
    this.logger.debug(`[getPageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNum}`);
    return this.notesService.getPageContent(userId, noteId, pageNum);
  }

  @Delete(':noteId/pages/:pageNumber/content')
  async deletePageContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    const pageNum = parseInt(pageNumber, 10);
    this.logger.debug(`[deletePageContent] userId=${userId} noteId=${noteId} pageNumber=${pageNum}`);
    return this.notesService.deletePageContent(userId, noteId, pageNum);
  }

  // Note-level content endpoints (NEW)
  @Post(':noteId/content')
  async saveNoteContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: SaveNoteContentDto,
  ) {
    this.logger.debug(`[saveNoteContent] userId=${userId} noteId=${noteId} pages=${Object.keys(dto.pages || {}).length}`);
    return this.notesService.saveNoteContent(userId, noteId, dto.pages);
  }

  @Get(':noteId/content')
  async getNoteContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[getNoteContent] userId=${userId} noteId=${noteId}`);
    return this.notesService.getNoteContent(userId, noteId);
  }

  @Delete(':noteId/content')
  async deleteNoteContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[deleteNoteContent] userId=${userId} noteId=${noteId}`);
    return this.notesService.deleteNoteContent(userId, noteId);
  }
}

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
import { CreateNoteDto, UpdateNoteDto } from './dto';
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
    @UploadedFiles() files: any[],
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
}

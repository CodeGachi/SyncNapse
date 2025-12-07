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
import { CreateNoteDto, UpdateNoteDto, SavePageTypingDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@Controller('notes')
@UseGuards(JwtAuthGuard)
@ApiTags('notes')
export class NotesController {
  private readonly logger = new Logger(NotesController.name);

  constructor(private readonly notesService: NotesService) { }

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
      `[createNote] userId=${userId} title=${dto.title} folderId=${dto.folder_id} type=${dto.type || 'student'} filesCount=${files?.length || 0}`,
    );
    this.logger.debug(`[createNote] DTO details:`, JSON.stringify(dto));
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

  @Post(':noteId/content')
  async saveNoteContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() body: { pages: any },
  ) {
    this.logger.debug(`[saveNoteContent] userId=${userId} noteId=${noteId}`);
    // If body.pages is missing but body has page keys directly (legacy/client issue), try to wrap it
    // But based on the log, the client sends { noteId, pages: { ... } } which is correct for DTO but here we extract body.pages
    return this.notesService.saveNoteContent(userId, noteId, body.pages);
  }

  @Get(':noteId/content')
  async getNoteContent(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[getNoteContent] userId=${userId} noteId=${noteId}`);
    return this.notesService.getNoteContent(userId, noteId);
  }

  @Post(':noteId/files')
  @UseInterceptors(FilesInterceptor('file'))
  async createFile(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      throw new Error('No file uploaded');
    }
    this.logger.debug(`[createFile] userId=${userId} noteId=${noteId} file=${file.originalname}`);
    return this.notesService.createFile(userId, noteId, file);
  }

  @Post(':noteId/files/:fileId')
  @UseInterceptors(FilesInterceptor('file'))
  async updateFile(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('fileId') fileId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const file = files && files.length > 0 ? files[0] : null;
    if (!file) {
      throw new Error('No file uploaded');
    }
    this.logger.debug(`[updateFile] userId=${userId} noteId=${noteId} fileId=${fileId}`);
    return this.notesService.updateFile(userId, noteId, fileId, file);
  }

  @Post(':noteId/files/:fileId/pages/:pageNumber/typing')
  @ApiOperation({ summary: 'Save page typing content with optimistic locking' })
  @ApiBody({ type: SavePageTypingDto })
  async savePageTyping(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('fileId') fileId: string,
    @Param('pageNumber') pageNumber: string,
    @Body() dto: SavePageTypingDto,
  ) {
    const pageNum = parseInt(pageNumber, 10);
    this.logger.debug(`[savePageTyping] userId=${userId} fileId=${fileId} page=${pageNum}`);
    return this.notesService.savePageTyping(userId, noteId, fileId, pageNum, dto.content, dto.version);
  }

  @Get(':noteId/files/:fileId/pages/:pageNumber/typing')
  async getPageTyping(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('fileId') fileId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    const pageNum = parseInt(pageNumber, 10);
    this.logger.debug(`[getPageTyping] userId=${userId} fileId=${fileId} page=${pageNum}`);
    return this.notesService.getPageTyping(userId, noteId, fileId, pageNum);
  }

  // Trash endpoints
  @Get('trash/list')
  async getTrashedNotes(@CurrentUser('id') userId: string) {
    this.logger.debug(`[getTrashedNotes] userId=${userId}`);
    return this.notesService.getTrashedNotes(userId);
  }

  @Post(':noteId/restore')
  async restoreNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[restoreNote] userId=${userId} noteId=${noteId}`);
    return this.notesService.restoreNote(userId, noteId);
  }

  @Delete(':noteId/permanent')
  async permanentlyDeleteNote(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[permanentlyDeleteNote] userId=${userId} noteId=${noteId}`);
    return this.notesService.permanentlyDeleteNote(userId, noteId);
  }

  // ============================================================================
  // Sharing endpoints
  // ============================================================================

  @Patch(':noteId/public-access')
  @ApiOperation({ summary: 'Update note public access level' })
  async updatePublicAccess(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() body: { publicAccess: 'PRIVATE' | 'PUBLIC_READ' | 'PUBLIC_EDIT' },
  ) {
    this.logger.debug(`[updatePublicAccess] userId=${userId} noteId=${noteId} access=${body.publicAccess}`);
    return this.notesService.updatePublicAccess(userId, noteId, body.publicAccess);
  }

  @Get(':noteId/collaborators')
  @ApiOperation({ summary: 'Get note collaborators' })
  async getCollaborators(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    this.logger.debug(`[getCollaborators] userId=${userId} noteId=${noteId}`);
    return this.notesService.getCollaborators(userId, noteId);
  }

  @Post(':noteId/collaborators')
  @ApiOperation({ summary: 'Invite collaborator by email' })
  async inviteCollaborator(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() body: { email: string; permission: 'VIEWER' | 'EDITOR' },
  ) {
    this.logger.debug(`[inviteCollaborator] userId=${userId} noteId=${noteId} email=${body.email}`);
    return this.notesService.inviteCollaborator(userId, noteId, body.email, body.permission);
  }

  @Patch(':noteId/collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Update collaborator permission' })
  async updateCollaboratorPermission(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() body: { permission: 'VIEWER' | 'EDITOR' },
  ) {
    this.logger.debug(`[updateCollaboratorPermission] userId=${userId} noteId=${noteId} collaboratorId=${collaboratorId}`);
    return this.notesService.updateCollaboratorPermission(userId, noteId, collaboratorId, body.permission);
  }

  @Delete(':noteId/collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Remove collaborator' })
  async removeCollaborator(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('collaboratorId') collaboratorId: string,
  ) {
    this.logger.debug(`[removeCollaborator] userId=${userId} noteId=${noteId} collaboratorId=${collaboratorId}`);
    return this.notesService.removeCollaborator(userId, noteId, collaboratorId);
  }

  @Post(':noteId/copy')
  @ApiOperation({ summary: 'Copy a shared note to my folder' })
  async copyNoteToMyFolder(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() body: { 
      folderId?: string; 
      title?: string;
      copyFiles?: boolean; // true = copy files, false = reference only (default: false)
    },
  ) {
    this.logger.debug(`[copyNoteToMyFolder] userId=${userId} noteId=${noteId} folderId=${body.folderId || 'default'} title=${body.title || 'auto'} copyFiles=${body.copyFiles ?? false}`);
    return this.notesService.copyNoteToMyFolder(userId, noteId, body.folderId, body.title, body.copyFiles ?? false);
  }
}
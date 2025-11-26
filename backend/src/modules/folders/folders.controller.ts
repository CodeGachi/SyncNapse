/**
 * Folders Controller
 * REST API for folder management
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('folders')
@ApiBearerAuth()
@Controller('folders')
@UseGuards(JwtAuthGuard)
export class FoldersController {
  private readonly logger = new Logger(FoldersController.name);

  constructor(private readonly foldersService: FoldersService) {}

  /**
   * Get all folders for the current user
   */
  @Get()
  async getFolders(@CurrentUser('id') userId: string) {
    this.logger.debug(`[getFolders] userId=${userId}`);
    return this.foldersService.getFoldersByUser(userId);
  }

  /**
   * Create a new folder
   */
  @Post()
  async createFolder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFolderDto,
  ) {
    this.logger.debug(`[createFolder] userId=${userId} name=${dto.name} parentId=${dto.parent_id || 'null'}`);
    return this.foldersService.createFolder(userId, dto);
  }

  /**
   * Update folder (rename)
   */
  @Patch(':folderId')
  async updateFolder(
    @CurrentUser('id') userId: string,
    @Param('folderId') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    this.logger.debug(`[updateFolder] userId=${userId} folderId=${folderId}`);
    return this.foldersService.updateFolder(userId, folderId, dto);
  }

  /**
   * Delete folder
   */
  @Delete(':folderId')
  async deleteFolder(
    @CurrentUser('id') userId: string,
    @Param('folderId') folderId: string,
  ) {
    this.logger.debug(`[deleteFolder] userId=${userId} folderId=${folderId}`);
    return this.foldersService.deleteFolder(userId, folderId);
  }

  /**
   * Move folder to a different parent
   */
  @Patch(':folderId/move')
  async moveFolder(
    @CurrentUser('id') userId: string,
    @Param('folderId') folderId: string,
    @Body() dto: { parentId: string | null },
  ) {
    this.logger.debug(`[moveFolder] userId=${userId} folderId=${folderId} newParentId=${dto.parentId || 'null'}`);
    return this.foldersService.moveFolder(userId, folderId, dto.parentId);
  }

  /**
   * Get folder path (breadcrumb)
   */
  @Get(':folderId/path')
  async getFolderPath(
    @CurrentUser('id') userId: string,
    @Param('folderId') folderId: string,
  ) {
    this.logger.debug(`[getFolderPath] userId=${userId} folderId=${folderId}`);
    return this.foldersService.getFolderPath(userId, folderId);
  }
}


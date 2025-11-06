/**
 * Folders Service
 * Business logic for folder management
 */

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreateFolderDto, UpdateFolderDto } from './dto';

@Injectable()
export class FoldersService {
  private readonly logger = new Logger(FoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all folders for a user
   */
  async getFoldersByUser(userId: string) {
    this.logger.debug(`[getFoldersByUser] Fetching folders for userId=${userId}`);
    
    const folders = await this.prisma.folder.findMany({
      where: {
        userId,
        deletedAt: null, // Only active folders
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.debug(`[getFoldersByUser] Found ${folders.length} folders`);
    
    // Convert to frontend format (snake_case to camelCase)
    return folders.map((folder) => ({
      id: folder.id,
      user_id: folder.userId,
      name: folder.name,
      parent_id: folder.parentId,
      created_at: folder.createdAt.toISOString(),
      updated_at: folder.updatedAt.toISOString(),
    }));
  }

  /**
   * Create a new folder
   */
  async createFolder(userId: string, dto: CreateFolderDto) {
    this.logger.debug(`[createFolder] Creating folder: ${dto.name} for userId=${userId}`);

    // Validate parent folder exists if parentId is provided
    if (dto.parent_id) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: dto.parent_id,
          userId,
          deletedAt: null,
        },
      });

      if (!parentFolder) {
        this.logger.warn(`[createFolder] Parent folder not found: ${dto.parent_id}`);
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = await this.prisma.folder.create({
      data: {
        name: dto.name,
        userId,
        parentId: dto.parent_id || null,
      },
    });

    this.logger.debug(`[createFolder] Created folder: ${folder.id}`);

    return {
      id: folder.id,
      user_id: folder.userId,
      name: folder.name,
      parent_id: folder.parentId,
      created_at: folder.createdAt.toISOString(),
      updated_at: folder.updatedAt.toISOString(),
    };
  }

  /**
   * Update folder (rename)
   */
  async updateFolder(userId: string, folderId: string, dto: UpdateFolderDto) {
    this.logger.debug(`[updateFolder] Updating folder: ${folderId}`);

    // Check folder exists and belongs to user
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      this.logger.warn(`[updateFolder] Folder not found: ${folderId}`);
      throw new NotFoundException('Folder not found');
    }

    const updatedFolder = await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        name: dto.name,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`[updateFolder] Updated folder: ${folderId}`);

    return {
      id: updatedFolder.id,
      user_id: updatedFolder.userId,
      name: updatedFolder.name,
      parent_id: updatedFolder.parentId,
      created_at: updatedFolder.createdAt.toISOString(),
      updated_at: updatedFolder.updatedAt.toISOString(),
    };
  }

  /**
   * Delete folder (soft delete)
   */
  async deleteFolder(userId: string, folderId: string) {
    this.logger.debug(`[deleteFolder] Deleting folder: ${folderId}`);

    // Check folder exists and belongs to user
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      this.logger.warn(`[deleteFolder] Folder not found: ${folderId}`);
      throw new NotFoundException('Folder not found');
    }

    // Soft delete
    await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        deletedAt: new Date(),
      },
    });

    this.logger.debug(`[deleteFolder] Deleted folder: ${folderId}`);

    return { message: 'Folder deleted successfully' };
  }

  /**
   * Move folder to a different parent
   */
  async moveFolder(userId: string, folderId: string, newParentId: string | null) {
    this.logger.debug(`[moveFolder] Moving folder ${folderId} to parent ${newParentId || 'root'}`);

    // Check folder exists and belongs to user
    const folder = await this.prisma.folder.findFirst({
      where: {
        id: folderId,
        userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      this.logger.warn(`[moveFolder] Folder not found: ${folderId}`);
      throw new NotFoundException('Folder not found');
    }

    // Prevent moving folder to itself
    if (folderId === newParentId) {
      this.logger.warn(`[moveFolder] Cannot move folder to itself`);
      throw new BadRequestException('Cannot move folder to itself');
    }

    // Validate new parent folder exists if newParentId is provided
    if (newParentId) {
      const parentFolder = await this.prisma.folder.findFirst({
        where: {
          id: newParentId,
          userId,
          deletedAt: null,
        },
      });

      if (!parentFolder) {
        this.logger.warn(`[moveFolder] Parent folder not found: ${newParentId}`);
        throw new NotFoundException('Parent folder not found');
      }

      // Prevent circular reference (moving to descendant)
      const isDescendant = await this.isDescendant(newParentId, folderId);
      if (isDescendant) {
        this.logger.warn(`[moveFolder] Cannot move folder to its descendant`);
        throw new BadRequestException('Cannot move folder to its descendant');
      }
    }

    const updatedFolder = await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        parentId: newParentId,
        updatedAt: new Date(),
      },
    });

    this.logger.debug(`[moveFolder] Moved folder: ${folderId}`);

    return {
      id: updatedFolder.id,
      user_id: updatedFolder.userId,
      name: updatedFolder.name,
      parent_id: updatedFolder.parentId,
      created_at: updatedFolder.createdAt.toISOString(),
      updated_at: updatedFolder.updatedAt.toISOString(),
    };
  }

  /**
   * Get folder path (for breadcrumb)
   */
  async getFolderPath(userId: string, folderId: string) {
    this.logger.debug(`[getFolderPath] Getting path for folder: ${folderId}`);

    const path: any[] = [];
    let currentFolderId: string | null = folderId;

    while (currentFolderId) {
      const folder: any = await this.prisma.folder.findFirst({
        where: {
          id: currentFolderId,
          userId,
          deletedAt: null,
        },
      });

      if (!folder) {
        this.logger.warn(`[getFolderPath] Folder not found in path: ${currentFolderId}`);
        throw new NotFoundException('Folder not found');
      }

      path.unshift({
        id: folder.id,
        user_id: folder.userId,
        name: folder.name,
        parent_id: folder.parentId,
        created_at: folder.createdAt.toISOString(),
        updated_at: folder.updatedAt.toISOString(),
      });

      currentFolderId = folder.parentId;
    }

    this.logger.debug(`[getFolderPath] Found path with ${path.length} folders`);
    return path;
  }

  /**
   * Check if targetId is a descendant of ancestorId
   */
  private async isDescendant(targetId: string, ancestorId: string): Promise<boolean> {
    let currentId: string | null = targetId;

    while (currentId) {
      if (currentId === ancestorId) {
        return true;
      }

      const folder: any = await this.prisma.folder.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!folder) break;
      currentId = folder.parentId;
    }

    return false;
  }
}


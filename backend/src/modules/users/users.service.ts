import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly emailService: EmailService,
  ) { }

  async findById(userId: string) {
    this.logger.debug(`findById userId=${userId}`);
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string) {
    this.logger.debug(`findByEmail email=${email}`);
    return this.prisma.user.findUnique({ where: { email } });
  }

  async updateUser(userId: string, updateUserDto: UpdateUserDto) {
    this.logger.debug(`updateUser userId=${userId}`);

    // Check if user exists first
    const existingUser = await this.findById(userId);
    if (!existingUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateUserDto,
        updatedAt: new Date(),
      },
    });
  }

  async upsertGoogleUser(params: { email: string; displayName: string }) {
    this.logger.debug(`upsertGoogleUser email=${params.email}`);

    // Ensure users/{email}/.deleted folder exists
    await this.ensureDeletedFolder(params.email);

    return this.prisma.user.upsert({
      where: { email: params.email },
      update: {
        displayName: params.displayName,
        authProvider: 'oauth:google',
        updatedAt: new Date(),
      },
      create: {
        email: params.email,
        displayName: params.displayName,
        authProvider: 'oauth:google',
        role: 'user',
      },
    });
  }

  // Soft Delete User
  async softDeleteUser(userId: string) {
    this.logger.log(`[softDeleteUser] Deactivating user: ${userId}`);
    
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1. Mark as deleted in DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // 2. Revoke all refresh tokens
    await this.prisma.refreshToken.updateMany({
      where: { userId },
      data: { 
        revokedAt: new Date(),
        revokedReason: 'user_soft_delete'
      }
    });

    // 3. Move storage folder to .deleted archive
    // Path: users/{email}/ -> users/.deleted/{email}/
    try {
      const userFolder = `users/${user.email}`;
      const archiveFolder = `users/.deleted/${user.email}_${Date.now()}`; // Timestamp to avoid conflicts
      
      this.logger.log(`[softDeleteUser] Archiving storage: ${userFolder} -> ${archiveFolder}`);
      await this.storageService.renameFolder(userFolder, archiveFolder);
    } catch (error) {
      this.logger.error(`[softDeleteUser] Failed to archive user storage`, error);
      // Continue even if storage move fails (DB is master of truth)
    }

    // 4. Send Email Notification
    void this.emailService.sendAccountDeletionNotice(user.email, 30);

    return { message: 'User deactivated successfully. Data will be kept for 30 days.' };
  }

  // Restore Soft-Deleted User
  async restoreUser(userId: string) {
    this.logger.log(`[restoreUser] Restoring user: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    // 1. Activate in DB
    await this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null },
    });

    // 2. Restore Storage (Move latest from .deleted back to users/{email})
    try {
      const deletedRoot = `users/.deleted`;
      const folders = await this.storageService.listFolders(deletedRoot);
      
      // Find folders starting with email
      const userArchives = folders.filter(f => f.startsWith(`${user.email}_`));
      
      if (userArchives.length > 0) {
        // Sort by timestamp descending (latest first)
        userArchives.sort().reverse();
        const latestArchive = userArchives[0];
        
        const srcPath = `${deletedRoot}/${latestArchive}`;
        const destPath = `users/${user.email}`;
        
        this.logger.log(`[restoreUser] Restoring storage: ${srcPath} -> ${destPath}`);
        await this.storageService.renameFolder(srcPath, destPath);
      }
    } catch (error) {
      this.logger.error(`[restoreUser] Failed to restore storage`, error);
    }

    // 3. Send Email Notification
    void this.emailService.sendAccountRestoredNotice(user.email);

    return { message: 'User restored successfully' };
  }

  // Hard Delete User (Admin or Scheduled)
  async hardDeleteUser(userId: string) {
    this.logger.warn(`[hardDeleteUser] PERMANENTLY deleting user: ${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) return;

    // 1. Delete from DB (Cascade will handle related data)
    await this.prisma.user.delete({ where: { id: userId } });

    // 2. Clean up archived storage
    // We need to find folders in users/.deleted/ that start with user's email
    try {
      // Since we don't have exact archived name (it has timestamp), 
      // meaningful cleanup might require listing folders in users/.deleted/ 
      // and checking if they start with user.email.
      // For now, if we know the exact path logic, we could try to delete.
      // But cleaner approach is to list and delete matches.
      
      const deletedRoot = `users/.deleted`;
      const folders = await this.storageService.listFolders(deletedRoot);
      
      for (const folder of folders) {
        if (folder.startsWith(user.email)) {
          const fullPath = `${deletedRoot}/${folder}`;
          this.logger.log(`[hardDeleteUser] Deleting archived storage: ${fullPath}`);
          await this.storageService.deleteFolderRecursively(fullPath);
        }
      }
    } catch (error) {
      this.logger.error(`[hardDeleteUser] Failed to cleanup storage`, error);
    }

    // 3. Send Email Notification
    void this.emailService.sendAccountPermanentlyDeletedNotice(user.email);
  }

  private async ensureDeletedFolder(email: string) {
    try {
      const key = `users/${email}/.deleted/.gitkeep`;
      await this.storageService.uploadBuffer(
        Buffer.from(''),
        key,
        'text/plain'
      );
      // Also ensure global .deleted folder for user archives
      await this.storageService.uploadBuffer(
        Buffer.from(''),
        `users/.deleted/.gitkeep`,
        'text/plain'
      );
      this.logger.debug(`[ensureDeletedFolder] Verified .deleted folders`);
    } catch (error) {
      this.logger.error(`[ensureDeletedFolder] Failed to create .deleted folder`, error);
    }
  }
}

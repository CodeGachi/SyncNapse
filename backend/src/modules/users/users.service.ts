import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  
  constructor(private readonly prisma: PrismaService) {}

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
}

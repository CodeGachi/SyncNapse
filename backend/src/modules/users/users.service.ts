import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async upsertGoogleUser(params: { email: string; displayName: string }) {
    // Debug: record upsert intent with dynamic values only
    this.logger.debug(`upsertGoogleUser email=${params.email}`);
    return this.prisma.user.upsert({
      where: { email: params.email },
      update: {
        displayName: params.displayName,
        authProvider: 'oauth:google',
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

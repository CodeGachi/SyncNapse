import { Controller, Post, Body, UseGuards, Req, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LiveblocksService } from './liveblocks.service';
import { PrismaService } from '../db/prisma.service';

@ApiTags('liveblocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('liveblocks')
export class LiveblocksController {
  private readonly logger = new Logger(LiveblocksController.name);

  constructor(
    private readonly liveblocksService: LiveblocksService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('auth')
  @ApiOperation({ summary: 'Authorize Liveblocks session' })
  async auth(@Req() req: any, @Body('room') room: string) {
    // req.user is populated by JwtAuthGuard (only contains { id: string })
    const userId = req.user?.id;

    // Fetch full user info from DB since JWT only contains userId
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, displayName: true },
    });

    if (!user) {
      this.logger.warn(`[auth] User not found: ${userId}`);
      throw new Error('User not found');
    }

    this.logger.debug(`[auth] user=${user.email} room=${room}`);

    const result = await this.liveblocksService.authorize(
      { id: user.id, email: user.email, displayName: user.displayName || 'User' },
      room
    );

    return JSON.parse(result.body);
  }
}

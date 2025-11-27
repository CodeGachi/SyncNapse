import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LiveblocksService } from './liveblocks.service';

@ApiTags('liveblocks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('liveblocks')
export class LiveblocksController {
  constructor(private readonly liveblocksService: LiveblocksService) {}

  @Post('auth')
  @ApiOperation({ summary: 'Authorize Liveblocks session' })
  async auth(@Req() req: any, @Body('room') room: string) {
    // req.user is populated by JwtAuthGuard
    const user = req.user; 
    // Expecting: { id: string, email: string, displayName: string, ... }
    // Ensure user object has required fields. If not, fetch from DB or ensure JWT strategy provides them.
    
    const result = await this.liveblocksService.authorize(
      { id: user.id, email: user.email, displayName: user.displayName || 'User' }, 
      room
    );
    
    // Return the raw body string directly as NestJS handles JSON serialization automatically,
    // but Liveblocks expects a specific string format.
    // Actually session.authorize() returns a JSON object { token: ... } or similar structure in body.
    return JSON.parse(result.body); 
  }
}

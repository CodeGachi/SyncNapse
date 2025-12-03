import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { AudioService } from './audio.service';
import { CreateAudioRecordingDto } from './dto/create-audio.dto';
import { CreateTimelineEventDto } from './dto/create-timeline-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('audio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audio')
export class AudioController {
  private readonly logger = new Logger(AudioController.name);

  constructor(private readonly audioService: AudioService) {}

  @Post('recordings')
  @ApiOperation({ summary: 'Create an audio recording (metadata + optional file)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        noteId: { type: 'string' },
        title: { type: 'string', nullable: true },
        durationSec: { type: 'number', nullable: true },
        file: {
          type: 'string',
          format: 'binary',
          nullable: true,
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async createRecording(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAudioRecordingDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.audioService.createRecording(userId, dto, file);
  }

  @Get('recordings/:id')
  @ApiOperation({ summary: 'Get recording details with timeline' })
  async getRecording(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.audioService.getRecording(userId, id);
  }

  @Delete('recordings/:id')
  @ApiOperation({ summary: 'Delete recording' })
  async deleteRecording(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.audioService.deleteRecording(userId, id);
  }

  @Post('recordings/:id/timeline')
  @ApiOperation({ summary: 'Add a timeline event (page view context)' })
  async addTimelineEvent(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: CreateTimelineEventDto,
  ) {
    return this.audioService.addTimelineEvent(userId, id, dto);
  }

  @Get('recordings/:id/timeline')
  @ApiOperation({ summary: 'Get timeline events' })
  async getTimelineEvents(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.audioService.getTimelineEvents(userId, id);
  }
}


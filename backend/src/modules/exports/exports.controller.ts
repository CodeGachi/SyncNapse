import { Controller, Get, Logger, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportsService } from './exports.service';

@ApiTags('exports')
@Controller('exports')
export class ExportsController {
  private readonly logger = new Logger(ExportsController.name);
  constructor(private readonly exportsService: ExportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('notes/:noteId')
  @ApiOperation({ summary: 'Generate export bundle for a note' })
  async generateNote(@Param('noteId') noteId: string) {
    return this.exportsService.createExportForNote(noteId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('download/:noteId')
  @ApiOperation({ summary: 'Download previously generated export' })
  async download(@Param('noteId') noteId: string, @Res() res: { setHeader: (k: string, v: string) => void; send: (b: unknown) => void }) {
    const { file } = await this.exportsService.createExportForNote(noteId);
    const { content } = await this.exportsService.readExport(file);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${noteId}.json"`);
    return res.send(content);
  }
}



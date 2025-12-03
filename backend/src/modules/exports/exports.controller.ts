import { Controller, Get, Logger, Param, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiOkResponse, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExportsService } from './exports.service';
import { ExportResultDto } from './dto';

@ApiTags('exports')
@ApiBearerAuth()
@Controller('exports')
export class ExportsController {
  private readonly logger = new Logger(ExportsController.name);
  
  constructor(private readonly exportsService: ExportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('notes/:noteId')
  @ApiOperation({ summary: 'Generate export bundle for a note' })
  @ApiParam({ name: 'noteId', description: 'Note ID', example: 'note-123' })
  @ApiOkResponse({ 
    description: 'Export generated successfully', 
    type: ExportResultDto 
  })
  async generateNote(@Param('noteId') noteId: string): Promise<ExportResultDto> {
    this.logger.debug(`generateNote called for noteId=${noteId}`);
    return this.exportsService.createExportForNote(noteId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('download/:noteId')
  @ApiOperation({ summary: 'Download export file for a note' })
  @ApiParam({ name: 'noteId', description: 'Note ID', example: 'note-123' })
  async download(
    @Param('noteId') noteId: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.debug(`download called for noteId=${noteId}`);
    
    // Generate export if not exists or regenerate
    const { file } = await this.exportsService.createExportForNote(noteId);
    const exportResult = await this.exportsService.readExport(file);
    const content = exportResult.stream;

    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${noteId}.json"`);
    // Stream does not have length property, omit Content-Length or verify file size before
    // res.setHeader('Content-Length', content.length); 

    // Send file
    content.pipe(res);
  }
}

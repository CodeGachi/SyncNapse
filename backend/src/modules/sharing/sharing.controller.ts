import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';
import { SharingService } from './sharing.service';
import { CreateCollaboratorDto } from './dto/create-collaborator.dto';
import { UpdateCollaboratorDto } from './dto/update-collaborator.dto';
import { UpdatePublicAccessDto } from './dto/update-public-access.dto';
import { UpdateAllowedDomainsDto } from './dto/update-allowed-domains.dto';

@ApiTags('sharing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notes/:noteId')
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  // --- Public Access ---

  @Patch('public-access')
  @ApiOperation({ summary: 'Update public access level (Private/Read/Edit)' })
  updatePublicAccess(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdatePublicAccessDto,
  ) {
    return this.sharingService.updatePublicAccess(userId, noteId, dto);
  }

  @Patch('allowed-domains')
  @ApiOperation({ summary: 'Update allowed email domains (e.g., ajou.ac.kr)' })
  updateAllowedDomains(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateAllowedDomainsDto,
  ) {
    return this.sharingService.updateAllowedDomains(userId, noteId, dto);
  }

  // --- Collaborators ---

  @Get('collaborators')
  @ApiOperation({ summary: 'List all collaborators for a note' })
  getCollaborators(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.sharingService.getCollaborators(userId, noteId);
  }

  @Post('collaborators')
  @ApiOperation({ summary: 'Invite a collaborator (by email)' })
  inviteCollaborator(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: CreateCollaboratorDto,
  ) {
    return this.sharingService.inviteCollaborator(userId, noteId, dto);
  }

  @Patch('collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Update collaborator permission (Viewer/Editor)' })
  updateCollaborator(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('collaboratorId') collaboratorId: string,
    @Body() dto: UpdateCollaboratorDto,
  ) {
    return this.sharingService.updateCollaborator(userId, noteId, collaboratorId, dto);
  }

  @Delete('collaborators/:collaboratorId')
  @ApiOperation({ summary: 'Remove a collaborator' })
  removeCollaborator(
    @CurrentUser('id') userId: string,
    @Param('noteId') noteId: string,
    @Param('collaboratorId') collaboratorId: string,
  ) {
    return this.sharingService.removeCollaborator(userId, noteId, collaboratorId);
  }
}

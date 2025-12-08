import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from './guards';
import { SettingsService } from './settings.service';
import { SystemSettingsDto, UpdateSystemSettingsDto, UpdateSystemSettingsResponseDto } from './dto';

/**
 * Settings Controller (Admin)
 * Base URL: /api/admin/settings
 * 
 * 관리자용 시스템 설정
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
export class SettingsController {
  private readonly logger = new Logger(SettingsController.name);

  constructor(private readonly settingsService: SettingsService) {}

  /**
   * 7.1 시스템 설정 조회
   * GET /api/admin/settings
   */
  @Get()
  @ApiOperation({
    summary: '시스템 설정 조회',
    description: '현재 시스템 설정을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '설정 조회 성공',
    type: SystemSettingsDto,
  })
  async getSettings(): Promise<{ data: SystemSettingsDto }> {
    this.logger.debug('GET /api/admin/settings');
    return await this.settingsService.getSettings();
  }

  /**
   * 7.2 시스템 설정 저장
   * PUT /api/admin/settings
   */
  @Put()
  @ApiOperation({
    summary: '시스템 설정 저장',
    description: '시스템 설정을 업데이트합니다. (environment는 읽기 전용)',
  })
  @ApiResponse({
    status: 200,
    description: '설정 저장 성공',
    type: UpdateSystemSettingsResponseDto,
  })
  async updateSettings(@Body() dto: UpdateSystemSettingsDto): Promise<UpdateSystemSettingsResponseDto> {
    this.logger.debug('PUT /api/admin/settings');
    return await this.settingsService.updateSettings(dto);
  }
}


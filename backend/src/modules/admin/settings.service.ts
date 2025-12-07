import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import {
  SystemSettingsDto,
  UpdateSystemSettingsDto,
  UpdateSystemSettingsResponseDto,
  GeneralSettingsDto,
  SecuritySettingsDto,
  EnvironmentSettingsDto,
} from './dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  // Mock 설정 저장소 (In-memory)
  private settings: SystemSettingsDto;

  constructor(private readonly prisma: PrismaService) {
    // 초기 설정값
    this.settings = new SystemSettingsDto({
      general: {
        maintenanceMode: false,
        maxUploadSize: 100,
        sessionTimeout: 60,
      },
      security: {
        requireEmailVerification: true,
        maxLoginAttempts: 5,
        lockoutDuration: 30,
      },
      environment: {
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        apiUrl: process.env.API_URL || 'http://localhost:4000',
        mockMode: true,
      },
    });
  }

  /**
   * 7.1 시스템 설정 조회
   * GET /api/admin/settings
   */
  async getSettings(): Promise<{ data: SystemSettingsDto }> {
    this.logger.debug('getSettings');

    try {
      return { data: this.settings };
    } catch (error) {
      this.logger.error('Failed to get settings', error);
      throw new InternalServerErrorException('설정 조회에 실패했습니다.');
    }
  }

  /**
   * 7.2 시스템 설정 저장
   * PUT /api/admin/settings
   */
  async updateSettings(dto: UpdateSystemSettingsDto): Promise<UpdateSystemSettingsResponseDto> {
    this.logger.debug(`updateSettings dto=${JSON.stringify(dto)}`);

    try {
      // 설정 업데이트 (부분 업데이트 지원)
      if (dto.general) {
        this.settings.general = { ...this.settings.general, ...dto.general };
      }

      if (dto.security) {
        this.settings.security = { ...this.settings.security, ...dto.security };
      }

      // 환경 설정은 읽기 전용이므로 업데이트하지 않음

      this.logger.log('Settings updated successfully');

      return new UpdateSystemSettingsResponseDto({
        success: true,
        message: '설정이 저장되었습니다.',
        data: this.settings,
      });
    } catch (error) {
      this.logger.error('Failed to update settings', error);
      throw new InternalServerErrorException('설정 저장에 실패했습니다.');
    }
  }
}


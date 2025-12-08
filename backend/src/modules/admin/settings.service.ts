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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 기본 설정값
   */
  private getDefaultSettings(): SystemSettingsDto {
    return new SystemSettingsDto({
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
        mockMode: process.env.NODE_ENV === 'development',
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
      // DB에서 설정 조회
      const [generalSettings, securitySettings] = await Promise.all([
        this.prisma.systemSettings.findUnique({ where: { key: 'general' } }),
        this.prisma.systemSettings.findUnique({ where: { key: 'security' } }),
      ]);

      const defaults = this.getDefaultSettings();

      // DB 값이 있으면 사용, 없으면 기본값
      const settings = new SystemSettingsDto({
        general: generalSettings ? (generalSettings.value as any) : defaults.general,
        security: securitySettings ? (securitySettings.value as any) : defaults.security,
        environment: defaults.environment, // 환경 설정은 항상 실시간 값 사용
      });

      return { data: settings };
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
      const updates: Promise<any>[] = [];

      // general 설정 저장 (Deep merge)
      if (dto.general) {
        const existing = await this.prisma.systemSettings.findUnique({
          where: { key: 'general' },
        });
        
        const merged = existing?.value
          ? { ...(existing.value as any), ...dto.general }
          : dto.general;

        updates.push(
          this.prisma.systemSettings.upsert({
            where: { key: 'general' },
            create: {
              key: 'general',
              value: merged as any,
            },
            update: {
              value: merged as any,
            },
          })
        );
      }

      // security 설정 저장 (Deep merge)
      if (dto.security) {
        const existing = await this.prisma.systemSettings.findUnique({
          where: { key: 'security' },
        });
        
        const merged = existing?.value
          ? { ...(existing.value as any), ...dto.security }
          : dto.security;

        updates.push(
          this.prisma.systemSettings.upsert({
            where: { key: 'security' },
            create: {
              key: 'security',
              value: merged as any,
            },
            update: {
              value: merged as any,
            },
          })
        );
      }

      await Promise.all(updates);

      // 업데이트된 설정 조회
      const updatedSettings = await this.getSettings();

      this.logger.log('Settings updated successfully');

      return new UpdateSystemSettingsResponseDto({
        success: true,
        message: '설정이 저장되었습니다.',
        data: updatedSettings.data,
      });
    } catch (error) {
      this.logger.error('Failed to update settings', error);
      throw new InternalServerErrorException('설정 저장에 실패했습니다.');
    }
  }
}


import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, Min, Max, IsOptional, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 7.1 일반 설정
 */
export class GeneralSettingsDto {
  @ApiProperty({ description: '유지보수 모드', example: false })
  @IsBoolean()
  maintenanceMode!: boolean;

  @ApiProperty({ description: '최대 업로드 크기 (MB)', example: 100 })
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUploadSize!: number;

  @ApiProperty({ description: '세션 타임아웃 (분)', example: 60 })
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeout!: number;
}

/**
 * 7.1 보안 설정
 */
export class SecuritySettingsDto {
  @ApiProperty({ description: '이메일 인증 필수', example: true })
  @IsBoolean()
  requireEmailVerification!: boolean;

  @ApiProperty({ description: '최대 로그인 시도 횟수', example: 5 })
  @IsInt()
  @Min(3)
  @Max(10)
  maxLoginAttempts!: number;

  @ApiProperty({ description: '계정 잠금 시간 (분)', example: 30 })
  @IsInt()
  @Min(5)
  @Max(1440)
  lockoutDuration!: number;
}

/**
 * 7.1 환경 설정 (읽기 전용)
 */
export class EnvironmentSettingsDto {
  @ApiProperty({ description: '버전', example: '1.0.0' })
  version!: string;

  @ApiProperty({ description: '환경', example: 'development' })
  environment!: string;

  @ApiProperty({ description: 'API URL', example: 'http://localhost:4000' })
  apiUrl!: string;

  @ApiProperty({ description: 'Mock 모드', example: true })
  mockMode!: boolean;
}

/**
 * 7.1 시스템 설정 조회 응답
 */
export class SystemSettingsDto {
  @ApiProperty({ description: '일반 설정', type: GeneralSettingsDto })
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general!: GeneralSettingsDto;

  @ApiProperty({ description: '보안 설정', type: SecuritySettingsDto })
  @ValidateNested()
  @Type(() => SecuritySettingsDto)
  security!: SecuritySettingsDto;

  @ApiProperty({ description: '환경 설정', type: EnvironmentSettingsDto })
  environment!: EnvironmentSettingsDto;

  constructor(partial: Partial<SystemSettingsDto>) {
    Object.assign(this, partial);
  }
}

/**
 * 7.2 시스템 설정 저장 요청
 */
export class UpdateSystemSettingsDto {
  @ApiProperty({ description: '일반 설정', type: GeneralSettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  general?: GeneralSettingsDto;

  @ApiProperty({ description: '보안 설정', type: SecuritySettingsDto, required: false })
  @IsOptional()
  @ValidateNested()
  @Type(() => SecuritySettingsDto)
  security?: SecuritySettingsDto;
}

/**
 * 7.2 시스템 설정 저장 응답
 */
export class UpdateSystemSettingsResponseDto {
  @ApiProperty({ description: '성공 여부', example: true })
  success!: boolean;

  @ApiProperty({ description: '메시지', example: '설정이 저장되었습니다.' })
  message!: string;

  @ApiProperty({ description: '업데이트된 설정', type: SystemSettingsDto })
  data!: SystemSettingsDto;

  constructor(partial: Partial<UpdateSystemSettingsResponseDto>) {
    Object.assign(this, partial);
  }
}


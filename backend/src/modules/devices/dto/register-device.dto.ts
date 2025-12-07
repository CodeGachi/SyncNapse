/**
 * DTO for device registration
 */

import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum DeviceType {
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
  TABLET = 'tablet',
}

export class RegisterDeviceDto {
  @IsString()
  deviceName!: string; // e.g., "iPhone 13", "MacBook Pro"

  @IsEnum(DeviceType)
  deviceType!: DeviceType;

  @IsString()
  fingerprint!: string; // Unique device identifier

  @IsOptional()
  @IsString()
  publicKey?: string; // Optional for future E2E encryption
}


/**
 * DTO for updating device information
 */

import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  deviceName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}


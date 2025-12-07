/**
 * Devices Controller
 * REST API for device management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto, UpdateDeviceDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/current-user.decorator';

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  /**
   * Register a new device
   */
  @Post('register')
  @ApiOperation({ summary: 'Register a new device' })
  async registerDevice(
    @CurrentUser('id') userId: string,
    @Body() dto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(userId, dto);
  }

  /**
   * Get all user's devices
   */
  @Get()
  @ApiOperation({ summary: 'Get all user devices' })
  async getDevices(@CurrentUser('id') userId: string) {
    return this.devicesService.getDevices(userId);
  }

  /**
   * Get available devices for pairing (excluding current device)
   */
  @Get('available/:currentDeviceId')
  @ApiOperation({ summary: 'Get available devices for pairing' })
  async getAvailableDevices(
    @CurrentUser('id') userId: string,
    @Param('currentDeviceId') currentDeviceId: string,
  ) {
    return this.devicesService.getAvailableDevicesForPairing(userId, currentDeviceId);
  }

  /**
   * Get a specific device
   */
  @Get(':deviceId')
  @ApiOperation({ summary: 'Get a specific device' })
  async getDevice(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.getDevice(userId, deviceId);
  }

  /**
   * Update device information
   */
  @Put(':deviceId')
  @ApiOperation({ summary: 'Update device information' })
  async updateDevice(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
    @Body() dto: UpdateDeviceDto,
  ) {
    return this.devicesService.updateDevice(userId, deviceId, dto);
  }

  /**
   * Delete a device
   */
  @Delete(':deviceId')
  @ApiOperation({ summary: 'Delete a device' })
  async deleteDevice(
    @CurrentUser('id') userId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.deleteDevice(userId, deviceId);
  }
}


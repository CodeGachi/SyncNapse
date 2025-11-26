/**
 * Devices Service
 * Manages trusted device registration and lifecycle
 */

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { RegisterDeviceDto, UpdateDeviceDto } from './dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new trusted device for a user
   */
  async registerDevice(userId: string, dto: RegisterDeviceDto) {
    // Check if device with same fingerprint already exists
    const existingDevice = await this.prisma.trustedDevice.findUnique({
      where: { fingerprint: dto.fingerprint },
    });

    if (existingDevice) {
      if (existingDevice.userId === userId) {
        // Update last seen time and reactivate if needed
        return this.prisma.trustedDevice.update({
          where: { id: existingDevice.id },
          data: {
            deviceName: dto.deviceName,
            deviceType: dto.deviceType,
            publicKey: dto.publicKey,
            lastSeenAt: new Date(),
            isActive: true,
          },
        });
      } else {
        throw new ConflictException('Device fingerprint already registered to another user');
      }
    }

    // Create new device
    return this.prisma.trustedDevice.create({
      data: {
        userId,
        deviceName: dto.deviceName,
        deviceType: dto.deviceType,
        fingerprint: dto.fingerprint,
        publicKey: dto.publicKey,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Get all devices for a user
   */
  async getDevices(userId: string) {
    return this.prisma.trustedDevice.findMany({
      where: { userId },
      orderBy: { lastSeenAt: 'desc' },
    });
  }

  /**
   * Get a specific device by ID
   */
  async getDevice(userId: string, deviceId: string) {
    const device = await this.prisma.trustedDevice.findFirst({
      where: { id: deviceId, userId },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return device;
  }

  /**
   * Get device by fingerprint (scoped to user for security)
   */
  async getDeviceByFingerprint(userId: string, fingerprint: string) {
    return this.prisma.trustedDevice.findFirst({
      where: { 
        userId,
        fingerprint 
      },
    });
  }

  /**
   * Update device information
   */
  async updateDevice(userId: string, deviceId: string, dto: UpdateDeviceDto) {
    const device = await this.getDevice(userId, deviceId);

    return this.prisma.trustedDevice.update({
      where: { id: device.id },
      data: {
        ...dto,
        lastSeenAt: new Date(),
      },
    });
  }

  /**
   * Delete a device
   */
  async deleteDevice(userId: string, deviceId: string) {
    const device = await this.getDevice(userId, deviceId);

    await this.prisma.trustedDevice.delete({
      where: { id: device.id },
    });

    return { success: true };
  }

  /**
   * Update device last seen timestamp
   */
  async updateLastSeen(deviceId: string) {
    return this.prisma.trustedDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * Get active devices for pairing (exclude current device)
   */
  async getAvailableDevicesForPairing(userId: string, currentDeviceId: string) {
    return this.prisma.trustedDevice.findMany({
      where: {
        userId,
        id: { not: currentDeviceId },
        isActive: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });
  }
}


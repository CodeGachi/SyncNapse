import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';

interface OnlineDevice {
  userId: string;
  deviceId: string;
  socketId: string;
  connectedAt: Date;
}

@Injectable()
export class WebrtcService {
  private readonly logger = new Logger(WebrtcService.name);
  
  private onlineDevices = new Map<string, OnlineDevice>();

  constructor(private readonly prisma: PrismaService) {}

  registerOnlineDevice(userId: string, deviceId: string, socketId: string) {
    const key = `${userId}:${deviceId}`;
    this.onlineDevices.set(key, {
      userId,
      deviceId,
      socketId,
      connectedAt: new Date(),
    });

    this.logger.log(`Device registered: ${key} -> ${socketId}`);
    this.logger.debug(`Total online devices: ${this.onlineDevices.size}`);
  }

  unregisterOnlineDevice(userId: string, deviceId: string) {
    const key = `${userId}:${deviceId}`;
    const removed = this.onlineDevices.delete(key);
    
    if (removed) {
      this.logger.log(`Device unregistered: ${key}`);
      this.logger.debug(`Total online devices: ${this.onlineDevices.size}`);
    }
  }

  getDeviceSocketId(userId: string, deviceId: string): string | null {
    const key = `${userId}:${deviceId}`;
    const device = this.onlineDevices.get(key);
    return device?.socketId || null;
  }

  getOnlineDevicesForUser(userId: string): OnlineDevice[] {
    return Array.from(this.onlineDevices.values()).filter(
      (device) => device.userId === userId,
    );
  }

  isDeviceOnline(userId: string, deviceId: string): boolean {
    const key = `${userId}:${deviceId}`;
    return this.onlineDevices.has(key);
  }

  async createTranscriptionSession(
    userId: string,
    senderDeviceId: string,
    receiverDeviceId: string,
    noteId?: string,
  ) {
    return this.prisma.transcriptionSession.create({
      data: {
        userId,
        title: `WebRTC Session ${new Date().toLocaleString()}`,
        noteId,
        status: 'recording',
      },
    });
  }

  async endTranscriptionSession(sessionId: string) {
    return this.prisma.transcriptionSession.update({
      where: { id: sessionId },
      data: {
        status: 'completed',
      },
    });
  }

  async getActiveSessions(userId: string) {
    return this.prisma.transcriptionSession.findMany({
      where: {
        userId,
        status: 'recording',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

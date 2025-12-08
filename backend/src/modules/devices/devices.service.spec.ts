import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { DevicesService } from './devices.service';
import { PrismaService } from '../db/prisma.service';
import { DeviceType } from './dto/register-device.dto';

describe('DevicesService', () => {
  let service: DevicesService;
  let mockPrismaService: any;

  const mockDevice = {
    id: 'device-123',
    userId: 'user-123',
    deviceName: 'iPhone 15 Pro',
    deviceType: 'mobile',
    fingerprint: 'fp-abc123',
    publicKey: null as string | null,
    lastSeenAt: new Date('2024-01-15T10:00:00Z'),
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  };

  beforeEach(async () => {
    mockPrismaService = {
      trustedDevice: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevicesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<DevicesService>(DevicesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerDevice', () => {
    it('should create a new device when fingerprint is unique', async () => {
      mockPrismaService.trustedDevice.findUnique.mockResolvedValue(null);
      mockPrismaService.trustedDevice.create.mockResolvedValue(mockDevice);

      const result = await service.registerDevice('user-123', {
        deviceName: 'iPhone 15 Pro',
        deviceType: DeviceType.MOBILE,
        fingerprint: 'fp-abc123',
      });

      expect(result).toEqual(mockDevice);
      expect(mockPrismaService.trustedDevice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          deviceName: 'iPhone 15 Pro',
          deviceType: DeviceType.MOBILE,
          fingerprint: 'fp-abc123',
        }),
      });
    });

    it('should update existing device when same user re-registers', async () => {
      mockPrismaService.trustedDevice.findUnique.mockResolvedValue(mockDevice);
      mockPrismaService.trustedDevice.update.mockResolvedValue({
        ...mockDevice,
        deviceName: 'iPhone 15 Pro Max',
        lastSeenAt: new Date(),
      });

      const result = await service.registerDevice('user-123', {
        deviceName: 'iPhone 15 Pro Max',
        deviceType: DeviceType.MOBILE,
        fingerprint: 'fp-abc123',
      });

      expect(result.deviceName).toBe('iPhone 15 Pro Max');
      expect(mockPrismaService.trustedDevice.update).toHaveBeenCalled();
    });

    it('should reactivate inactive device on re-registration', async () => {
      mockPrismaService.trustedDevice.findUnique.mockResolvedValue({
        ...mockDevice,
        isActive: false,
      });
      mockPrismaService.trustedDevice.update.mockResolvedValue({
        ...mockDevice,
        isActive: true,
      });

      await service.registerDevice('user-123', {
        deviceName: 'iPhone 15 Pro',
        deviceType: DeviceType.MOBILE,
        fingerprint: 'fp-abc123',
      });

      expect(mockPrismaService.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: expect.objectContaining({ isActive: true }),
      });
    });

    it('should throw ConflictException when fingerprint belongs to another user', async () => {
      mockPrismaService.trustedDevice.findUnique.mockResolvedValue({
        ...mockDevice,
        userId: 'different-user',
      });

      await expect(
        service.registerDevice('user-123', {
          deviceName: 'MacBook Pro',
          deviceType: DeviceType.DESKTOP,
          fingerprint: 'fp-abc123',
        })
      ).rejects.toThrow(ConflictException);
    });

    it('should save publicKey when provided', async () => {
      mockPrismaService.trustedDevice.findUnique.mockResolvedValue(null);
      mockPrismaService.trustedDevice.create.mockResolvedValue({
        ...mockDevice,
        publicKey: 'public-key-xyz',
      });

      await service.registerDevice('user-123', {
        deviceName: 'iPhone 15 Pro',
        deviceType: DeviceType.MOBILE,
        fingerprint: 'fp-abc123',
        publicKey: 'public-key-xyz',
      });

      expect(mockPrismaService.trustedDevice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ publicKey: 'public-key-xyz' }),
      });
    });
  });

  describe('getDevices', () => {
    it('should return all devices for a user', async () => {
      const devices = [
        mockDevice,
        { ...mockDevice, id: 'device-456', deviceName: 'MacBook Pro', deviceType: 'desktop' },
      ];
      mockPrismaService.trustedDevice.findMany.mockResolvedValue(devices);

      const result = await service.getDevices('user-123');

      expect(result).toHaveLength(2);
      expect(mockPrismaService.trustedDevice.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { lastSeenAt: 'desc' },
      });
    });

    it('should return empty array when user has no devices', async () => {
      mockPrismaService.trustedDevice.findMany.mockResolvedValue([]);

      const result = await service.getDevices('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getDevice', () => {
    it('should return device by ID', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(mockDevice);

      const result = await service.getDevice('user-123', 'device-123');

      expect(result).toEqual(mockDevice);
      expect(mockPrismaService.trustedDevice.findFirst).toHaveBeenCalledWith({
        where: { id: 'device-123', userId: 'user-123' },
      });
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.getDevice('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });

    it('should not return device belonging to different user', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.getDevice('different-user', 'device-123')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDeviceByFingerprint', () => {
    it('should return device by fingerprint scoped to user', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(mockDevice);

      const result = await service.getDeviceByFingerprint('user-123', 'fp-abc123');

      expect(result).toEqual(mockDevice);
      expect(mockPrismaService.trustedDevice.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123', fingerprint: 'fp-abc123' },
      });
    });

    it('should return null when fingerprint not found for user', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(null);

      const result = await service.getDeviceByFingerprint('user-123', 'unknown-fp');

      expect(result).toBeNull();
    });
  });

  describe('updateDevice', () => {
    it('should update device name', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.trustedDevice.update.mockResolvedValue({
        ...mockDevice,
        deviceName: 'Updated Name',
      });

      const result = await service.updateDevice('user-123', 'device-123', {
        deviceName: 'Updated Name',
      });

      expect(result.deviceName).toBe('Updated Name');
    });

    it('should update lastSeenAt on any update', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.trustedDevice.update.mockResolvedValue({
        ...mockDevice,
        lastSeenAt: new Date(),
      });

      await service.updateDevice('user-123', 'device-123', {});

      expect(mockPrismaService.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      });
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.updateDevice('user-123', 'nonexistent', { deviceName: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDevice', () => {
    it('should delete device', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(mockDevice);
      mockPrismaService.trustedDevice.delete.mockResolvedValue(mockDevice);

      const result = await service.deleteDevice('user-123', 'device-123');

      expect(result).toEqual({ success: true });
      expect(mockPrismaService.trustedDevice.delete).toHaveBeenCalledWith({
        where: { id: mockDevice.id },
      });
    });

    it('should throw NotFoundException when device not found', async () => {
      mockPrismaService.trustedDevice.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDevice('user-123', 'nonexistent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateLastSeen', () => {
    it('should update lastSeenAt timestamp', async () => {
      const updatedDevice = { ...mockDevice, lastSeenAt: new Date() };
      mockPrismaService.trustedDevice.update.mockResolvedValue(updatedDevice);

      const result = await service.updateLastSeen('device-123');

      expect(result.lastSeenAt).toBeDefined();
      expect(mockPrismaService.trustedDevice.update).toHaveBeenCalledWith({
        where: { id: 'device-123' },
        data: { lastSeenAt: expect.any(Date) },
      });
    });
  });

  describe('getAvailableDevicesForPairing', () => {
    it('should return active devices excluding current device', async () => {
      const devices = [
        { ...mockDevice, id: 'device-456', deviceName: 'MacBook Pro' },
        { ...mockDevice, id: 'device-789', deviceName: 'iPad Pro' },
      ];
      mockPrismaService.trustedDevice.findMany.mockResolvedValue(devices);

      const result = await service.getAvailableDevicesForPairing('user-123', 'device-123');

      expect(result).toHaveLength(2);
      expect(result.map((d: any) => d.id)).not.toContain('device-123');
      expect(mockPrismaService.trustedDevice.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          id: { not: 'device-123' },
          isActive: true,
        },
        orderBy: { lastSeenAt: 'desc' },
      });
    });

    it('should return empty array when no other devices available', async () => {
      mockPrismaService.trustedDevice.findMany.mockResolvedValue([]);

      const result = await service.getAvailableDevicesForPairing('user-123', 'device-123');

      expect(result).toEqual([]);
    });
  });
});

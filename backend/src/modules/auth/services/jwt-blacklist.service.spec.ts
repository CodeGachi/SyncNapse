import { Test, TestingModule } from '@nestjs/testing';
import { JwtBlacklistService } from './jwt-blacklist.service';
import { PrismaService } from '../../db/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('JwtBlacklistService', () => {
  let service: JwtBlacklistService;

  const mockPrismaService = {
    jwtBlacklist: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const mockJwtService = {
    decode: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtBlacklistService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<JwtBlacklistService>(JwtBlacklistService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blacklistToken', () => {
    it('should blacklist a valid token', async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;
      
      mockJwtService.decode.mockReturnValue({
        jti: 'jwt-id-123',
        exp: futureTimestamp,
      });

      mockPrismaService.jwtBlacklist.create.mockResolvedValue({
        id: 'blacklist-id',
        jti: 'jwt-id-123',
        expiresAt: new Date(futureTimestamp * 1000),
        reason: 'logout',
      });

      await service.blacklistToken('valid-token', 'logout');

      expect(mockJwtService.decode).toHaveBeenCalledWith('valid-token');
      expect(mockPrismaService.jwtBlacklist.create).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid token gracefully', async () => {
      mockJwtService.decode.mockReturnValue(null);

      await service.blacklistToken('invalid-token', 'logout');

      expect(mockPrismaService.jwtBlacklist.create).not.toHaveBeenCalled();
    });
  });

  describe('isBlacklisted', () => {
    it('should return true for blacklisted token', async () => {
      mockPrismaService.jwtBlacklist.findUnique.mockResolvedValue({
        jti: 'jwt-id-123',
        reason: 'logout',
      });

      const result = await service.isBlacklisted('jwt-id-123');

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      mockPrismaService.jwtBlacklist.findUnique.mockResolvedValue(null);

      const result = await service.isBlacklisted('jwt-id-456');

      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired blacklist entries', async () => {
      mockPrismaService.jwtBlacklist.deleteMany.mockResolvedValue({ count: 10 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(10);
      expect(mockPrismaService.jwtBlacklist.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
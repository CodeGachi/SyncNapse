import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../../db/prisma.service';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRefreshToken', () => {
    it('should create a refresh token successfully', async () => {
      const userId = 'user-123';
      const expiresInDays = 30;

      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-id',
        userId,
        token: 'hashed-token',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const result = await service.createRefreshToken(userId, expiresInDays);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('tokenId');
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateAndRotate', () => {
    it('should throw UnauthorizedException if token not found', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      await expect(
        service.validateAndRotate('invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if token is revoked', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        revokedAt: new Date(),
        revokedReason: 'logout',
      });

      await expect(
        service.validateAndRotate('revoked-token'),
      ).rejects.toThrow('Refresh token has been revoked');
    });

    it('should throw UnauthorizedException if token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        userId: 'user-123',
        expiresAt: expiredDate,
        revokedAt: null,
        usedAt: null,
      });

      mockPrismaService.refreshToken.update.mockResolvedValue({});

      await expect(
        service.validateAndRotate('expired-token'),
      ).rejects.toThrow('Refresh token has expired');
    });
  });

  describe('revokeToken', () => {
    it('should revoke a token successfully', async () => {
      mockPrismaService.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.revokeToken('some-token', 'user_logout');

      expect(mockPrismaService.refreshToken.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should delete expired tokens', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredTokens();

      expect(result).toBe(5);
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalledTimes(1);
    });
  });
});
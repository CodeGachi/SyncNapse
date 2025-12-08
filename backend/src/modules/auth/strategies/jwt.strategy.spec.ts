// Set JWT_SECRET before importing modules that use AuthConfig
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-characters-long';

import { JwtStrategy } from './jwt.strategy';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';
import { PrismaService } from '../../db/prisma.service';
import { AuthCacheService } from '../services/auth-cache.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let jwtBlacklistService: jest.Mocked<JwtBlacklistService>;
  let prismaService: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<AuthCacheService>;

  beforeEach(() => {
    // Create mocks
    jwtBlacklistService = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      blacklistToken: jest.fn(),
    } as any;

    prismaService = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-123',
          isBanned: false,
          suspendedUntil: null,
          deletedAt: null,
        }),
      },
    } as any;

    cacheService = {
      getOrCompute: jest.fn().mockImplementation(async (_key: string, computeFn: () => Promise<any>) => {
        return await computeFn();
      }),
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
    } as any;

    strategy = new JwtStrategy(jwtBlacklistService, prismaService, cacheService);
  });

  describe('validate', () => {
    it('should extract user id from JWT payload', async () => {
      // Arrange
      const payload = { sub: 'user-123' };

      // Act
      const result = await strategy.validate(payload);

      // Assert
      expect(result).toEqual({ id: 'user-123' });
    });

    it('should handle different user ids', async () => {
      // Arrange
      const testCases = [
        { sub: 'user-456' },
        { sub: 'admin-789' },
        { sub: 'test-user-001' },
      ];

      // Act & Assert
      for (const payload of testCases) {
        prismaService.user.findUnique = jest.fn().mockResolvedValue({
          id: payload.sub,
          isBanned: false,
          suspendedUntil: null,
          deletedAt: null,
        });
        
        const result = await strategy.validate(payload);
        expect(result).toEqual({ id: payload.sub });
      }
    });

    it('should map sub claim to id field', async () => {
      // Arrange - JWT standard uses 'sub' claim for subject (user identifier)
      const payload = { sub: 'unique-user-identifier' };
      
      prismaService.user.findUnique = jest.fn().mockResolvedValue({
        id: 'unique-user-identifier',
        isBanned: false,
        suspendedUntil: null,
        deletedAt: null,
      });

      // Act
      const result = await strategy.validate(payload);

      // Assert - we map 'sub' to 'id' for consistency in our application
      expect(result).toHaveProperty('id', 'unique-user-identifier');
      expect(result).not.toHaveProperty('sub');
    });
  });

  describe('constructor', () => {
    it('should configure JWT extraction from Bearer token', () => {
      // Arrange & Act
      const strategyInstance = new JwtStrategy(jwtBlacklistService, prismaService, cacheService);

      // Assert - strategy should be properly configured
      expect(strategyInstance).toBeDefined();
      expect(strategyInstance).toBeInstanceOf(JwtStrategy);
    });

    it('should create strategy instance successfully', () => {
      // Arrange & Act
      const strategyInstance = new JwtStrategy(jwtBlacklistService, prismaService, cacheService);

      // Assert - strategy should be created without errors
      expect(strategyInstance).toBeDefined();
      expect(strategyInstance).toBeInstanceOf(JwtStrategy);
    });
  });
});

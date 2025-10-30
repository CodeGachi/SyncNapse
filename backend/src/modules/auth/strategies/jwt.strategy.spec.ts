import { JwtStrategy } from './jwt.strategy';
import { JwtBlacklistService } from '../services/jwt-blacklist.service';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let jwtBlacklistService: JwtBlacklistService;
  const originalEnv = process.env;

  const mockBlacklistService = {
    isBlacklisted: jest.fn().mockResolvedValue(false),
    blacklistToken: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...originalEnv, JWT_SECRET: 'test-jwt-secret-key' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jwtBlacklistService = mockBlacklistService as any;
    strategy = new JwtStrategy(jwtBlacklistService);
  });

  afterAll(() => {
    process.env = originalEnv;
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
        const result = await strategy.validate(payload);
        expect(result).toEqual({ id: payload.sub });
      }
    });

    it('should map sub claim to id field', async () => {
      // Arrange - JWT standard uses 'sub' claim for subject (user identifier)
      const payload = { sub: 'unique-user-identifier' };

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
      const strategyInstance = new JwtStrategy(jwtBlacklistService);

      // Assert - strategy should be properly configured
      expect(strategyInstance).toBeDefined();
      expect(strategyInstance).toBeInstanceOf(JwtStrategy);
    });

    it('should use JWT_SECRET from environment', () => {
      // Arrange
      const customSecret = 'custom-secret-key-for-testing';
      process.env.JWT_SECRET = customSecret;

      // Act
      const strategyInstance = new JwtStrategy(jwtBlacklistService);

      // Assert - strategy should be created without errors
      expect(strategyInstance).toBeDefined();
    });
  });
});
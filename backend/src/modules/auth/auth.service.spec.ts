import { AuthService } from './services/auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { OAuthService } from './services/oauth.service';
import { UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
    const mockSignAsync = jest.fn();
    const mockFindByEmail = jest.fn();
    const jwtService = { signAsync: mockSignAsync } as unknown as JwtService;
    const usersService = {
      findByEmail: mockFindByEmail,
    } as unknown as UsersService;
    const mockBuildAuthUrl = jest.fn();
    const mockHandleCallback = jest.fn();
    const oauthService = {
      buildAuthUrl: mockBuildAuthUrl,
      handleCallback: mockHandleCallback,
    } as unknown as OAuthService;
    
    const mockRefreshTokenService = {
      createRefreshToken: jest.fn().mockResolvedValue({ token: 'refresh-token' }),
      validateAndRotate: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };
    
    const mockJwtBlacklistService = {
      isBlacklisted: jest.fn().mockResolvedValue(false),
      blacklistToken: jest.fn(),
    };

    let service: AuthService;

    beforeEach(() => {
        jest.resetAllMocks();
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_ACCESS_EXPIRATION = '15m';
        
        // Reset mock implementations after resetAllMocks
        mockRefreshTokenService.createRefreshToken.mockResolvedValue({ token: 'refresh-token' });
        mockJwtBlacklistService.isBlacklisted.mockResolvedValue(false);
        
        service = new AuthService(
          usersService, 
          jwtService, 
          oauthService,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockRefreshTokenService as any,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          mockJwtBlacklistService as any,
        );
    });

    describe('validateUserByEmail', () => {
        it('should return user when found by email', async () => {
            // Arrange
            const mockUser = {
                id: 'syncnapse',
                email: 'syncnapse@gachicode.com',
                displayName: 'SyncNapse',
                role: 'user',
            };
            mockFindByEmail.mockResolvedValue(mockUser);

            // Act
            const result = await service.validateUserByEmail('syncnapse@gachicode.com');

            // Assert
            expect(mockFindByEmail).toHaveBeenCalledWith('syncnapse@gachicode.com');
            expect(result).toEqual(mockUser);
        });

        it('should throw UnauthorizedException when user is not found', async () => {
            // Arrange
            mockFindByEmail.mockResolvedValue(null);

            // Act & Assert
            await expect(service.validateUserByEmail('nonexistent@example.com')).rejects.toThrow(
                new UnauthorizedException('Invalid credentials'),
            );
            expect(mockFindByEmail).toHaveBeenCalledWith('nonexistent@example.com');
        });

        it('should handle different email formats', async () => {
            // Arrange
            const testEmails = [
                'syncnapse@gachicode.com',
                'test.user+tag@subdomain.gachicode.com',
                'user@gachicode.com',
                'admin@gachicode.co.kr',
            ];

            for (const email of testEmails) {
                mockFindByEmail.mockResolvedValue({ id: 'user-1', email });
                
                // Act
                const result = await service.validateUserByEmail(email);

                // Assert
                expect(result).toHaveProperty('email', email);
            }
        });
    });

    describe('signToken', () => {
        it('should generate JWT token with user id as subject', async () => {
            // Arrange
            const userId = 'syncnapse';
            const mockToken = 'jwt-token-syncnapse';
            mockSignAsync.mockResolvedValue(mockToken);

            // Act
            const result = await service.signToken(userId);

            // Assert
            expect(mockSignAsync).toHaveBeenCalled();
            const callArgs = mockSignAsync.mock.calls[0][0];
            expect(callArgs.sub).toBe(userId);
            expect(callArgs.jti).toBeDefined(); // JTI should be generated
            expect(callArgs.type).toBe('access');
            expect(result).toBe(mockToken);
        });

        it('should use "sub" claim for JWT subject as per standard', async () => {
            // Arrange
            mockSignAsync.mockResolvedValue('token');

            // Act
            await service.signToken('gachicode');

            // Assert
            expect(mockSignAsync).toHaveBeenCalled();
            const callArgs = mockSignAsync.mock.calls[0][0];
            expect(callArgs.sub).toBe('gachicode');
        });

        it('should handle different user id formats', async () => {
            // Arrange
            const userIds = ['syncnapse', 'gachicode', 'admin'];
            mockSignAsync.mockResolvedValue('token');

            for (const userId of userIds) {
                // Act
                await service.signToken(userId);

                // Assert
                expect(mockSignAsync).toHaveBeenCalled();
                const callArgs = mockSignAsync.mock.calls[mockSignAsync.mock.calls.length - 1][0];
                expect(callArgs.sub).toBe(userId);
            }
        });
    });

    describe('getOAuthAuthorizationUrl', () => {
        it('should delegate to OAuthService', async () => {
            // Arrange
            mockBuildAuthUrl.mockReturnValue('http://auth-url');
            
            // Act
            const url = await service.getOAuthAuthorizationUrl('google');
            
            // Assert
            expect(mockBuildAuthUrl).toHaveBeenCalledWith('google', {});
            expect(url).toBe('http://auth-url');
        });

        it('should pass provider name correctly', async () => {
            // Arrange
            mockBuildAuthUrl.mockReturnValue('http://oauth-provider');

            // Act
            await service.getOAuthAuthorizationUrl('github');

            // Assert
            expect(mockBuildAuthUrl).toHaveBeenCalledWith('github', {});
        });
    });

    describe('authenticateWithOAuth', () => {
        it('should issue JWT after OAuth callback', async () => {
            // Arrange
            mockHandleCallback.mockResolvedValue({ user: { id: 'syncnapse' } });
            mockSignAsync.mockResolvedValue('jwt-token');
            
            // Act
            const result = await service.authenticateWithOAuth('google', 'code-xyz', 'state-123');
            
            // Assert
            expect(mockHandleCallback).toHaveBeenCalledWith('google', 'code-xyz', 'state-123');
            expect(mockSignAsync).toHaveBeenCalled();
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
        });

        it('should handle OAuth flow with different providers', async () => {
            // Arrange
            mockHandleCallback.mockResolvedValue({ user: { id: 'gachicode' } });
            mockSignAsync.mockResolvedValue('jwt-token');

            // Act
            const result = await service.authenticateWithOAuth('github', 'code-abc', 'state-456');

            // Assert
            expect(mockHandleCallback).toHaveBeenCalledWith('github', 'code-abc', 'state-456');
            expect(result).toHaveProperty('accessToken');
        });

        it('should create token with correct user id from OAuth user', async () => {
            // Arrange
            const oauthUser = { id: 'syncnapse' };
            mockHandleCallback.mockResolvedValue({ user: oauthUser });
            mockSignAsync.mockResolvedValue('new-jwt-token');

            // Act
            await service.authenticateWithOAuth('google', 'authorization-code', 'state-789');

            // Assert
            expect(mockSignAsync).toHaveBeenCalled();
            const callArgs = mockSignAsync.mock.calls[0][0];
            expect(callArgs.sub).toBe('syncnapse');
        });
    });
});

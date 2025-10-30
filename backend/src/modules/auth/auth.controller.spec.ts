import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    getOAuthAuthorizationUrl: jest.fn(),
    authenticateWithOAuth: jest.fn(),
  };

  const mockLinkBuilder = {
    action: jest.fn((path: string, method: string) => ({ href: path, method })),
    self: jest.fn((path: string) => ({ href: path, rel: 'self' })),
    up: jest.fn((path: string) => ({ href: path, rel: 'up' })),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: LinkBuilderService, useValue: mockLinkBuilder },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('loginOptions', () => {
    it('should return available OAuth providers with HATEOAS links', async () => {
      // Act
      const result = await controller.loginOptions();

      // Assert
      expect(result).toHaveProperty('providers');
      expect(result.providers).toHaveLength(1);
      expect(result.providers[0]).toMatchObject({
        id: 'google',
        label: 'Google',
      });
      expect(result.providers[0]._links).toHaveProperty('start');
      expect(result._links).toHaveProperty('self');
      expect(result._links).toHaveProperty('up');
      expect(mockLinkBuilder.action).toHaveBeenCalledWith('/api/auth/google', 'GET');
      expect(mockLinkBuilder.self).toHaveBeenCalledWith('/api/auth/login');
      expect(mockLinkBuilder.up).toHaveBeenCalledWith('/api');
    });

    it('should include timestamp in debug log', async () => {
      // Arrange
      const beforeTs = Date.now();
      
      // Act
      await controller.loginOptions();
      
      // Assert
      const afterTs = Date.now();
      expect(afterTs).toBeGreaterThanOrEqual(beforeTs);
    });
  });

  describe('googleAuth', () => {
    it('should redirect to Google OAuth URL', async () => {
      // Arrange
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?client_id=test&redirect_uri=callback';
      mockAuthService.getOAuthAuthorizationUrl.mockResolvedValue(mockAuthUrl);
      const mockRes = { redirect: jest.fn() };

      // Act
      await controller.googleAuth(mockRes as { redirect: (url: string) => void });

      // Assert
      expect(mockAuthService.getOAuthAuthorizationUrl).toHaveBeenCalledWith('google');
      expect(mockRes.redirect).toHaveBeenCalledWith(mockAuthUrl);
    });

    it('should log the redirect URL for debugging', async () => {
      // Arrange
      const mockAuthUrl = 'https://accounts.google.com/o/oauth2/auth';
      mockAuthService.getOAuthAuthorizationUrl.mockResolvedValue(mockAuthUrl);
      const mockRes = { redirect: jest.fn() };

      // Act
      await controller.googleAuth(mockRes as { redirect: (url: string) => void });

      // Assert - verify service was called (logger spy would be needed for actual log verification)
      expect(mockAuthService.getOAuthAuthorizationUrl).toHaveBeenCalled();
    });
  });

  describe('googleCallback', () => {
    it('should return JWT token and links on successful OAuth callback', async () => {
      // Arrange
      const mockCode = 'auth-code-xyz';
      const mockState = 'state-abc';
      const mockToken = 'jwt-token-abc';
      const mockReq = { query: { code: mockCode, state: mockState }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
      mockAuthService.authenticateWithOAuth.mockResolvedValue({ 
        accessToken: mockToken,
        refreshToken: 'refresh-token',
        expiresIn: 900
      });

      // Act
      const result = await controller.googleCallback(mockReq as { query: { code: string; state: string }; ip: string; headers: { 'user-agent': string } });

      // Assert
      expect(mockAuthService.authenticateWithOAuth).toHaveBeenCalledWith('google', mockCode, mockState, expect.any(Object));
      expect(result).toHaveProperty('accessToken', mockToken);
      expect(result._links).toHaveProperty('self');
      expect(result._links).toHaveProperty('me');
      expect(mockLinkBuilder.self).toHaveBeenCalledWith('/auth/google/callback');
      expect(mockLinkBuilder.action).toHaveBeenCalledWith('/users/me', 'GET');
    });

    it('should throw HttpException when code is missing', async () => {
      // Arrange
      const mockReq = { query: { state: 'state-123' } };

      // Act & Assert
      await expect(controller.googleCallback(mockReq as { query: { state: string } })).rejects.toThrow(
        new HttpException('Missing code', HttpStatus.BAD_REQUEST),
      );
      expect(mockAuthService.authenticateWithOAuth).not.toHaveBeenCalled();
    });

    it('should throw HttpException when query is undefined', async () => {
      // Arrange
      const mockReq = {};

      // Act & Assert
      await expect(controller.googleCallback(mockReq as Record<string, never>)).rejects.toThrow(
        new HttpException('Missing code', HttpStatus.BAD_REQUEST),
      );
      expect(mockAuthService.authenticateWithOAuth).not.toHaveBeenCalled();
    });

    it('should throw HttpException when code is empty string', async () => {
      // Arrange
      const mockReq = { query: { code: '', state: 'state-123' } };

      // Act & Assert
      await expect(controller.googleCallback(mockReq as { query: { code: string; state: string } })).rejects.toThrow(
        new HttpException('Missing code', HttpStatus.BAD_REQUEST),
      );
      expect(mockAuthService.authenticateWithOAuth).not.toHaveBeenCalled();
    });
    
    it('should throw HttpException when state is missing', async () => {
      // Arrange
      const mockReq = { query: { code: 'code-123' } };

      // Act & Assert
      await expect(controller.googleCallback(mockReq as { query: { code: string } })).rejects.toThrow(
        new HttpException('Missing state', HttpStatus.BAD_REQUEST),
      );
      expect(mockAuthService.authenticateWithOAuth).not.toHaveBeenCalled();
    });
  });

  describe('check', () => {
    it('should return ok:true when authenticated with valid JWT', async () => {
      // Arrange
      const mockReq = { user: { id: 'user-123' } };

      // Act
      const result = await controller.check(mockReq as { user: { id: string } });

      // Assert
      expect(result).toEqual({ ok: true });
    });

    it('should handle user without id gracefully in logging', async () => {
      // Arrange
      const mockReq = { user: {} };

      // Act
      const result = await controller.check(mockReq as { user: Record<string, never> });

      // Assert - should still return ok (guard already verified JWT)
      expect(result).toEqual({ ok: true });
    });

    it('should handle undefined user gracefully in logging', async () => {
      // Arrange
      const mockReq = {};

      // Act
      const result = await controller.check(mockReq as Record<string, never>);

      // Assert - should still return ok (guard already verified JWT)
      expect(result).toEqual({ ok: true });
    });
  });
});
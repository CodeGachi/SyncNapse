import { OAuthService } from './oauth.service';
import { UsersService } from '../../users/users.service';
import { OAuthStateService } from './oauth-state.service';
import { UnauthorizedException } from '@nestjs/common';

describe('OAuthService (direct implementation)', () => {
  const realEnv = process.env;
  let service: OAuthService;
  const mockUpsertGoogleUser = jest.fn();
  const mockCreateState = jest.fn();
  const mockValidateState = jest.fn();
  
  const usersService = {
    upsertGoogleUser: mockUpsertGoogleUser,
  } as unknown as UsersService;
  
  const oauthStateService = {
    createState: mockCreateState,
    validateState: mockValidateState,
  } as unknown as OAuthStateService;

  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...realEnv };
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
    process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
    
    // Mock state creation to return a fixed state
    mockCreateState.mockResolvedValue('test-state-123');
    mockValidateState.mockResolvedValue({ redirectUrl: undefined });
    
    service = new OAuthService(usersService, oauthStateService);
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    process.env = realEnv;
  });

  describe('buildAuthUrl', () => {
    it('should construct authorization URL with required params', async () => {
      // Act
      const url = await service.buildAuthUrl('google');

      // Assert
      expect(url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(url).toContain('client_id=test-google-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fgoogle%2Fcallback');
      expect(url).toContain('response_type=code');
      expect(url).toContain('scope=');
      expect(url).toContain('include_granted_scopes=true');
      expect(url).toContain('access_type=offline');
      expect(url).toContain('state=test-state-123');
      expect(mockCreateState).toHaveBeenCalledWith('google', undefined);
    });

    it('should throw UnauthorizedException when client_id is not configured', async () => {
      // Arrange
      process.env.GOOGLE_CLIENT_ID = '';

      // Act & Assert
      await expect(service.buildAuthUrl('google')).rejects.toThrow(
        new UnauthorizedException('OAuth provider not configured'),
      );
    });

    it('should throw UnauthorizedException when callback URL is not configured', async () => {
      // Arrange
      process.env.GOOGLE_CALLBACK_URL = undefined;

      // Act & Assert
      await expect(service.buildAuthUrl('google')).rejects.toThrow(
        new UnauthorizedException('OAuth provider not configured'),
      );
    });

    it('should include custom scopes when provided', async () => {
      // Act
      const url = await service.buildAuthUrl('google', { scope: ['openid', 'email'] });

      // Assert - URLSearchParams uses + for spaces, which is valid in OAuth
      expect(url).toContain('scope=openid+email');
    });

    it('should include redirect URL when provided', async () => {
      // Act
      const url = await service.buildAuthUrl('google', { redirectUrl: '/dashboard' });

      // Assert
      expect(url).toContain('state=test-state-123');
      expect(mockCreateState).toHaveBeenCalledWith('google', '/dashboard');
    });

    it('should use default scopes when custom scopes are not provided', async () => {
      // Act
      const url = await service.buildAuthUrl('google');

      // Assert - URLSearchParams uses + for spaces, which is valid in OAuth
      expect(url).toContain('scope=openid+profile+email');
    });
  });

  describe('exchangeCode', () => {
    it('should exchange authorization code for access token', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'access-token-123', id_token: 'id-token-456' }),
        text: async () => '',
      } as Response);

      // Act
      const tokens = await service.exchangeCode('google', 'auth-code-xyz');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      expect(tokens).toEqual({ access_token: 'access-token-123', id_token: 'id-token-456' });
    });

    it('should throw UnauthorizedException when token exchange fails', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant',
      } as Response);

      // Act & Assert
      await expect(service.exchangeCode('google', 'invalid-code')).rejects.toThrow(
        new UnauthorizedException('OAuth token exchange failed'),
      );
    });

    it('should throw UnauthorizedException when provider is not configured', async () => {
      // Arrange
      process.env.GOOGLE_CLIENT_ID = undefined;

      // Act & Assert
      await expect(service.exchangeCode('google', 'code')).rejects.toThrow(
        new UnauthorizedException('OAuth provider not configured'),
      );
    });

    it('should include client_secret in request body', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'token' }),
        text: async () => '',
      } as Response);

      // Act
      await service.exchangeCode('google', 'code-123');

      // Assert
      const callBody = mockFetch.mock.calls[0][1]?.body as URLSearchParams;
      expect(callBody.get('client_secret')).toBe('test-google-client-secret');
    });
  });

  describe('fetchUserInfo', () => {
    it('should fetch user information using access token', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ sub: 'user-123', email: 'user@example.com', name: 'User Name' }),
        text: async () => '',
      } as Response);

      // Act
      const userInfo = await service.fetchUserInfo('google', 'access-token-abc');

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        { headers: { Authorization: 'Bearer access-token-abc' } },
      );
      expect(userInfo).toEqual({ sub: 'user-123', email: 'user@example.com', name: 'User Name' });
    });

    it('should throw UnauthorizedException when userinfo fetch fails', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      } as Response);

      // Act & Assert
      await expect(service.fetchUserInfo('google', 'invalid-token')).rejects.toThrow(
        new UnauthorizedException('OAuth userinfo failed'),
      );
    });
  });

  describe('handleCallback', () => {
    it('should exchange code, fetch userinfo, and upsert user', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'access-token-abc' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sub: 'google-sub-1', email: 'user@example.com', name: 'Test User' }),
          text: async () => '',
        } as Response);

      mockUpsertGoogleUser.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'Test User',
        role: 'user',
      });

      // Act
      const { user } = await service.handleCallback('google', 'code-xyz', 'test-state-123');

      // Assert
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockValidateState).toHaveBeenCalledWith('test-state-123', 'google');
      expect(mockUpsertGoogleUser).toHaveBeenCalledWith({
        email: 'user@example.com',
        displayName: 'Test User',
      });
      expect(user).toMatchObject({ id: 'user-1' });
    });

    it('should throw UnauthorizedException when email is missing from OAuth provider', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sub: 'google-sub-1', name: 'Test User' }), // Missing email
          text: async () => '',
        } as Response);

      // Act & Assert
      await expect(service.handleCallback('google', 'code', 'test-state-123')).rejects.toThrow(
        new UnauthorizedException('OAuth provider did not return required user information (email, sub)'),
      );
    });

    it('should throw UnauthorizedException when sub is missing from OAuth provider', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ email: 'user@example.com', name: 'Test User' }), // Missing sub
          text: async () => '',
        } as Response);

      // Act & Assert
      await expect(service.handleCallback('google', 'code', 'test-state-123')).rejects.toThrow(
        new UnauthorizedException('OAuth provider did not return required user information (email, sub)'),
      );
    });

    it('should use email prefix as displayName when name is not provided', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sub: 'sub-123', email: 'testuser@example.com' }), // No name
          text: async () => '',
        } as Response);

      mockUpsertGoogleUser.mockResolvedValue({
        id: 'user-2',
        email: 'testuser@example.com',
        displayName: 'testuser',
        role: 'user',
      });

      // Act
      await service.handleCallback('google', 'code', 'test-state-123');

      // Assert
      expect(mockUpsertGoogleUser).toHaveBeenCalledWith({
        email: 'testuser@example.com',
        displayName: 'testuser',
      });
    });

    it('should propagate token exchange errors', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      // Act & Assert
      await expect(service.handleCallback('google', 'bad-code', 'test-state-123')).rejects.toThrow(
        new UnauthorizedException('OAuth token exchange failed'),
      );
    });

    it('should propagate userinfo fetch errors', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Internal Server Error',
        } as Response);

      // Act & Assert
      await expect(service.handleCallback('google', 'code', 'test-state-123')).rejects.toThrow(
        new UnauthorizedException('OAuth userinfo failed'),
      );
    });
  });

  describe('logging', () => {
    it('should log when building auth URL', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.buildAuthUrl('google');

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
    });

    it('should log mapped user info during callback', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: 'token' }),
          text: async () => '',
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ sub: 'sub-1', email: 'test@example.com', name: 'Test' }),
          text: async () => '',
        } as Response);
      mockUpsertGoogleUser.mockResolvedValue({ id: 'user-1', email: 'test@example.com' });
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      await service.handleCallback('google', 'code', 'test-state-123');

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('oauth mapped provider=google email=test@example.com');
    });

    it('should log token exchange failure details', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant error details',
      } as Response);
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      try {
        await service.exchangeCode('google', 'bad-code');
      } catch {
        // Expected to throw
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('token exchange failed status=400 body=invalid_grant error details');
    });

    it('should log userinfo fetch failure details', async () => {
      // Arrange
      const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized access',
      } as Response);
      const loggerSpy = jest.spyOn(service['logger'], 'debug');

      // Act
      try {
        await service.fetchUserInfo('google', 'bad-token');
      } catch {
        // Expected to throw
      }

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith('userinfo fetch failed status=401 body=Unauthorized access');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';

/**
 * AuthController Unit Tests
 */
describe('AuthController', () => {
  let controller: any;
  let mockAuthService: any;
  let mockUsersService: any;

  beforeEach(async () => {
    mockAuthService = {
      createTokenPair: jest.fn().mockResolvedValue({
        accessToken: 'test-access-token',
        refreshToken: 'test-refresh-token',
        expiresIn: 3600,
      }),
      refreshAccessToken: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      }),
      logout: jest.fn().mockResolvedValue(undefined),
      validateToken: jest.fn().mockResolvedValue({ userId: 'user-1', type: 'restore_token' }),
      signRestoreToken: jest.fn().mockResolvedValue('restore-token'),
    };

    mockUsersService = {
      restoreUser: jest.fn().mockResolvedValue({ message: 'User restored' }),
      hardDeleteUser: jest.fn().mockResolvedValue(undefined),
    };

    const { AuthController } = await import('./auth.controller');
    const { AuthService } = await import('./services/auth.service');
    const { UsersService } = await import('../users/users.service');

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('googleAuth', () => {
    it('should be defined', () => {
      expect(controller.googleAuth).toBeDefined();
    });

    it('should not throw when called', async () => {
      await expect(controller.googleAuth()).resolves.not.toThrow();
    });
  });

  describe('googleAuthCallback', () => {
    it('should redirect to frontend with tokens on success', async () => {
      const mockReq = {
        user: { id: 'user-123' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'test' },
      };
      const mockRes = {
        cookie: jest.fn(),
        redirect: jest.fn(),
      };

      await controller.googleAuthCallback(mockReq, mockRes);

      expect(mockAuthService.createTokenPair).toHaveBeenCalledWith('user-123', expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'test-refresh-token', expect.any(Object));
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('accessToken=test-access-token'));
    });

    it('should redirect to restore page if user is soft deleted', async () => {
      const mockReq = {
        user: { id: 'user-123', deletedAt: new Date() },
      };
      const mockRes = {
        redirect: jest.fn(),
      };

      await controller.googleAuthCallback(mockReq, mockRes);

      expect(mockAuthService.signRestoreToken).toHaveBeenCalledWith('user-123');
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('restore?token=restore-token'));
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const mockReq = {
        headers: { 'x-refresh-token': 'old-refresh-token' },
        cookies: {},
        ip: '127.0.0.1',
      };
      const mockRes = {
        cookie: jest.fn(),
      };

      const result = await controller.refresh(mockReq, mockRes);

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('old-refresh-token', expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'new-refresh-token', expect.any(Object));
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      });
    });

    it('should use cookie if header not present', async () => {
      const mockReq = {
        headers: {},
        cookies: { refreshToken: 'cookie-refresh-token' },
        ip: '127.0.0.1',
      };
      const mockRes = {
        cookie: jest.fn(),
      };

      await controller.refresh(mockReq, mockRes);

      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('cookie-refresh-token', expect.any(Object));
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      const mockUser = { id: 'user-123' };
      const mockReq = {
        cookies: { refreshToken: 'rt' },
        headers: { authorization: 'Bearer at' },
      };
      const mockRes = {
        clearCookie: jest.fn(),
      };

      await controller.logout(mockUser, mockReq, mockRes);

      expect(mockAuthService.logout).toHaveBeenCalledWith('at', 'rt');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('authToken');
    });
  });

  describe('restoreAccount', () => {
    it('should restore user account', async () => {
      const result = await controller.restoreAccount('valid-token');

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockUsersService.restoreUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'User restored' });
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete user account', async () => {
      const result = await controller.permanentDelete('valid-token');

      expect(mockAuthService.validateToken).toHaveBeenCalledWith('valid-token');
      expect(mockUsersService.hardDeleteUser).toHaveBeenCalledWith('user-1');
      expect(result).toEqual({ message: 'Account permanently deleted' });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { UsersService } from '../users/users.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    createTokenPair: jest.fn(),
    refreshAccessToken: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
    signRestoreToken: jest.fn(),
  };

  const mockUsersService = {
    restoreUser: jest.fn(),
    hardDeleteUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('googleAuth', () => {
    it('should be defined', async () => {
      expect(controller.googleAuth).toBeDefined();
      await expect(controller.googleAuth()).resolves.not.toThrow();
    });
  });

  describe('googleAuthCallback', () => {
    it('should redirect to frontend with tokens on successful OAuth callback', async () => {
      // Arrange
      const mockUser = { id: 'user-123' };
      const mockReq = { user: mockUser, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
      const mockRes = { redirect: jest.fn(), cookie: jest.fn() };
      const mockTokens = { accessToken: 'at', refreshToken: 'rt', expiresIn: 3600 };
      
      mockAuthService.createTokenPair.mockResolvedValue(mockTokens);

      // Act
      await controller.googleAuthCallback(mockReq, mockRes as any);

      // Assert
      expect(mockAuthService.createTokenPair).toHaveBeenCalledWith(mockUser.id, expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'rt', expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith('authToken', 'at', expect.any(Object));
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining('accessToken=at'));
    });

    it('should redirect to restore page if user is soft deleted', async () => {
      // Arrange
      const mockUser = { id: 'user-123', deletedAt: new Date() };
      const mockReq = { user: mockUser };
      const mockRes = { redirect: jest.fn() };
      const mockRestoreToken = 'restore-token';
      
      mockAuthService.signRestoreToken.mockResolvedValue(mockRestoreToken);

      // Act
      await controller.googleAuthCallback(mockReq, mockRes as any);

      // Assert
      expect(mockAuthService.signRestoreToken).toHaveBeenCalledWith(mockUser.id);
      expect(mockRes.redirect).toHaveBeenCalledWith(expect.stringContaining(`restore?token=${mockRestoreToken}`));
    });
  });

  describe('refresh', () => {
    it('should refresh tokens', async () => {
      // Arrange
      const mockReq = { cookies: { refreshToken: 'old-rt' }, ip: '127.0.0.1', headers: { 'user-agent': 'test' } };
      const mockRes = { cookie: jest.fn() };
      const mockTokens = { accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 3600 };
      
      mockAuthService.refreshAccessToken.mockResolvedValue(mockTokens);

      // Act
      const result = await controller.refresh(mockReq, mockRes as any);

      // Assert
      expect(mockAuthService.refreshAccessToken).toHaveBeenCalledWith('old-rt', expect.any(Object));
      expect(mockRes.cookie).toHaveBeenCalledWith('refreshToken', 'new-rt', expect.any(Object));
      expect(result).toEqual({ accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 3600 });
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      // Arrange
      const mockUser = { id: 'user-123' };
      const mockReq = { cookies: { refreshToken: 'rt' }, headers: { authorization: 'Bearer at' } };
      const mockRes = { clearCookie: jest.fn() };

      // Act
      await controller.logout(mockUser, mockReq, mockRes as any);

      // Assert
      expect(mockAuthService.logout).toHaveBeenCalledWith('at', 'rt');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(mockRes.clearCookie).toHaveBeenCalledWith('authToken');
    });
  });

  describe('restoreAccount', () => {
    it('should restore user account', async () => {
      const token = 'valid-token';
      mockAuthService.validateToken.mockResolvedValue({ userId: 'user-1', type: 'restore_token' });
      mockUsersService.restoreUser.mockResolvedValue({ message: 'Restored' });

      const result = await controller.restoreAccount(token);
      expect(result).toEqual({ message: 'Restored' });
      expect(mockUsersService.restoreUser).toHaveBeenCalledWith('user-1');
    });
  });

  describe('permanentDelete', () => {
    it('should permanently delete user account', async () => {
      const token = 'valid-token';
      mockAuthService.validateToken.mockResolvedValue({ userId: 'user-1', type: 'restore_token' });
      mockUsersService.hardDeleteUser.mockResolvedValue(undefined);

      const result = await controller.permanentDelete(token);
      expect(result).toEqual({ message: 'Account permanently deleted' });
      expect(mockUsersService.hardDeleteUser).toHaveBeenCalledWith('user-1');
    });
  });
});

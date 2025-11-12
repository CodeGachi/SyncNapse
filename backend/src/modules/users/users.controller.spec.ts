import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

describe('UsersController', () => {
  let controller: UsersController;

  const mockUsersService = {
    findById: jest.fn(),
    updateUser: jest.fn(),
  };

  const mockHalService = {
    resource: jest.fn((data, links) => ({ ...data, _links: links })),
  };

  const mockLinkBuilderService = {
    self: jest.fn((href) => ({ href })),
    action: jest.fn((href, method) => ({ href, method })),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'user',
    authProvider: 'oauth:google',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        { provide: HalService, useValue: mockHalService },
        { provide: LinkBuilderService, useValue: mockLinkBuilderService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return current user with HAL links', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getMe({ id: 'user-123' });

      // Assert
      expect(result).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('_links');
      expect(result._links).toHaveProperty('self');
      expect(result._links).toHaveProperty('update');
      expect(result._links).toHaveProperty('spaces');
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.getMe({ id: 'nonexistent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all user fields in response', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(mockUser);

      // Act
      const result = await controller.getMe({ id: 'user-123' });

      // Assert
      expect(result).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        displayName: mockUser.displayName,
        role: mockUser.role,
        authProvider: mockUser.authProvider,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });
  });

  describe('updateMe', () => {
    it('should update current user successfully', async () => {
      // Arrange
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      // Assert
      expect(result).toHaveProperty('displayName', 'Updated Name');
      expect(result).toHaveProperty('_links');
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      mockUsersService.updateUser.mockResolvedValue(null);

      // Act & Assert
      await expect(
        controller.updateMe({ id: 'nonexistent' }, { displayName: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should return HAL resource with self link', async () => {
      // Arrange
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      // Assert
      expect(result._links).toHaveProperty('self');
      expect(mockLinkBuilderService.self).toHaveBeenCalledWith('/api/users/me');
    });

    it('should handle empty update dto', async () => {
      // Arrange
      const updateDto = {};
      mockUsersService.updateUser.mockResolvedValue(mockUser);

      // Act
      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      // Assert
      expect(result).toBeDefined();
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });
  });

  describe('logging', () => {
    it('should log debug message on getMe', async () => {
      // Arrange
      mockUsersService.findById.mockResolvedValue(mockUser);
      const loggerSpy = jest.spyOn(controller['logger'], 'debug');

      // Act
      await controller.getMe({ id: 'user-123' });

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('userId=user-123'));
    });

    it('should log debug message on updateMe', async () => {
      // Arrange
      mockUsersService.updateUser.mockResolvedValue(mockUser);
      const loggerSpy = jest.spyOn(controller['logger'], 'debug');

      // Act
      await controller.updateMe({ id: 'user-123' }, { displayName: 'New Name' });

      // Assert
      expect(loggerSpy).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(expect.stringContaining('userId=user-123'));
    });
  });
});

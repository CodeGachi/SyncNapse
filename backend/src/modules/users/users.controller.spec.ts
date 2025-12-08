import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { HalService } from '../hypermedia/hal.service';
import { LinkBuilderService } from '../hypermedia/link-builder.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: any;
  let mockHalService: any;
  let mockLinkBuilderService: any;

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
    // Create fresh mocks for each test
    mockUsersService = {
      findById: jest.fn(),
      updateUser: jest.fn(),
    };

    mockLinkBuilderService = {
      self: jest.fn((href) => ({ href })),
      action: jest.fn((href, method) => ({ href, method })),
    };

    mockHalService = {
      resource: jest.fn((data, links) => ({ ...data, _links: links })),
    };

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
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe({ id: 'user-123' });

      expect(result).toHaveProperty('id', 'user-123');
      expect(result).toHaveProperty('email', 'test@example.com');
      expect(result).toHaveProperty('_links');
      expect(result._links).toHaveProperty('self');
      expect(result._links).toHaveProperty('update');
      expect(result._links).toHaveProperty('spaces');
      expect(mockUsersService.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        controller.getMe({ id: 'nonexistent' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should include all user fields in response', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await controller.getMe({ id: 'user-123' });

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
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      expect(result).toHaveProperty('displayName', 'Updated Name');
      expect(result).toHaveProperty('_links');
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockUsersService.updateUser.mockResolvedValue(null);

      await expect(
        controller.updateMe({ id: 'nonexistent' }, { displayName: 'New Name' })
      ).rejects.toThrow(NotFoundException);
    });

    it('should return HAL resource with self link', async () => {
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      mockUsersService.updateUser.mockResolvedValue(updatedUser);

      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      expect(result._links).toHaveProperty('self');
      expect(mockLinkBuilderService.self).toHaveBeenCalledWith('/api/users/me');
    });

    it('should handle empty update dto', async () => {
      const updateDto = {};
      mockUsersService.updateUser.mockResolvedValue(mockUser);

      const result = await controller.updateMe({ id: 'user-123' }, updateDto);

      expect(result).toBeDefined();
      expect(mockUsersService.updateUser).toHaveBeenCalledWith('user-123', updateDto);
    });
  });
});

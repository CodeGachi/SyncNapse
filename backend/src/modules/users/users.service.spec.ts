import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../db/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
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
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findById('user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findById('nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return user when found by email', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Act
      const result = await service.findByEmail('test@example.com');

      // Assert
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null when user not found', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findByEmail('nonexistent@example.com');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      // Arrange
      const updateDto = { displayName: 'Updated Name' };
      const updatedUser = { ...mockUser, displayName: 'Updated Name' };
      
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.updateUser('user-123', updateDto);

      // Assert
      expect(result.displayName).toBe('Updated Name');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: expect.objectContaining({
          displayName: 'Updated Name',
          updatedAt: expect.any(Date),
        }),
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateUser('nonexistent', { displayName: 'New Name' })
      ).rejects.toThrow(NotFoundException);
      
      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });
  });

  describe('upsertGoogleUser', () => {
    it('should create new user when not exists', async () => {
      // Arrange
      const params = {
        email: 'new@example.com',
        displayName: 'New User',
      };
      mockPrismaService.user.upsert.mockResolvedValue({
        ...mockUser,
        email: params.email,
        displayName: params.displayName,
      });

      // Act
      const result = await service.upsertGoogleUser(params);

      // Assert
      expect(result.email).toBe(params.email);
      expect(mockPrismaService.user.upsert).toHaveBeenCalledWith({
        where: { email: params.email },
        update: expect.objectContaining({
          displayName: params.displayName,
          authProvider: 'oauth:google',
        }),
        create: expect.objectContaining({
          email: params.email,
          displayName: params.displayName,
          authProvider: 'oauth:google',
          role: 'user',
        }),
      });
    });

    it('should update existing user when already exists', async () => {
      // Arrange
      const params = {
        email: 'existing@example.com',
        displayName: 'Updated Display Name',
      };
      mockPrismaService.user.upsert.mockResolvedValue({
        ...mockUser,
        displayName: params.displayName,
      });

      // Act
      const result = await service.upsertGoogleUser(params);

      // Assert
      expect(result.displayName).toBe(params.displayName);
      expect(mockPrismaService.user.upsert).toHaveBeenCalled();
    });
  });
});
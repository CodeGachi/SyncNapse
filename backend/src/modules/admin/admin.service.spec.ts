import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaService } from '../db/prisma.service';

describe('AdminService', () => {
  let service: AdminService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCurrentAdminUser', () => {
    it('should return admin user when user exists', async () => {
      const mockUser = {
        id: 'user-001',
        email: 'admin@test.com',
        displayName: 'Admin User',
        role: 'admin',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser as any);

      const result = await service.getCurrentAdminUser('user-001');

      expect(result).toEqual({
        id: 'user-001',
        email: 'admin@test.com',
        name: 'Admin User',
        role: 'admin',
        permissions: expect.any(Array),
      });

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        select: {
          id: true,
          email: true,
          displayName: true,
          role: true,
          deletedAt: true,
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCurrentAdminUser('non-existent')).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.getCurrentAdminUser('non-existent')).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
    });

    it('should throw NotFoundException when user is deleted', async () => {
      const deletedUser = {
        id: 'user-001',
        email: 'deleted@test.com',
        displayName: 'Deleted User',
        role: 'user',
        deletedAt: new Date(),
      };

      prismaService.user.findUnique.mockResolvedValue(deletedUser as any);

      await expect(service.getCurrentAdminUser('user-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '../db/prisma.service';

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      folder: {
        count: jest.fn(),
      },
      note: {
        count: jest.fn(),
      },
      upload: {
        count: jest.fn(),
        aggregate: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated user list', async () => {
      const mockUsers = [
        {
          id: 'user-001',
          email: 'user1@test.com',
          displayName: 'User 1',
          picture: null,
          role: 'user',
          createdAt: new Date(),
          deletedAt: null,
          refreshTokens: [{ createdAt: new Date() }],
        },
      ];

      prismaService.user.findMany.mockResolvedValue(mockUsers as any);
      prismaService.user.count.mockResolvedValue(100);

      const result = await service.getUsers({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.pageSize).toBe(20);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should throw BadRequestException for invalid page', async () => {
      await expect(service.getUsers({ page: 0, limit: 20 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid limit', async () => {
      await expect(service.getUsers({ page: 1, limit: -1 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should filter by role', async () => {
      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.user.count.mockResolvedValue(0);

      await service.getUsers({ page: 1, limit: 20, role: 'admin' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({ role: 'admin' }),
            ]),
          }),
        }),
      );
    });

    it('should search by email or name', async () => {
      prismaService.user.findMany.mockResolvedValue([]);
      prismaService.user.count.mockResolvedValue(0);

      await service.getUsers({ page: 1, limit: 20, search: 'test' });

      expect(prismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('getUserDetail', () => {
    it('should return user detail with stats', async () => {
      const mockUser = {
        id: 'user-001',
        email: 'user@test.com',
        displayName: 'Test User',
        picture: null,
        role: 'user',
        createdAt: new Date(),
        deletedAt: null,
        refreshTokens: [{ createdAt: new Date() }],
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.folder.count.mockResolvedValue(10);
      prismaService.upload.count.mockResolvedValue(5);
      prismaService.upload.aggregate.mockResolvedValue({
        _sum: { totalSizeBytes: 1024000000 },
      } as any);
      prismaService.auditLog.count.mockResolvedValue(50);
      prismaService.auditLog.findMany.mockResolvedValue([]);

      const result = await service.getUserDetail('user-001');

      expect(result.data.id).toBe('user-001');
      expect(result.data.stats.notesCount).toBe(10);
      expect(result.data.stats.storageUsedMb).toBe(977); // 1024000000 bytes = 977 MB
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserDetail('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException when user is deleted', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        deletedAt: new Date(),
      } as any);

      await expect(service.getUserDetail('user-001')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      const mockUser = {
        id: 'user-001',
        role: 'user',
        deletedAt: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser as any);
      prismaService.user.update.mockResolvedValue({
        ...mockUser,
        role: 'admin',
      } as any);

      const result = await service.updateUserRole('user-001', { role: 'admin' });

      expect(result.id).toBe('user-001');
      expect(result.role).toBe('admin');
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        data: { role: 'admin' },
        select: { id: true, role: true },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserRole('non-existent', { role: 'admin' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when role is same', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        role: 'admin',
        deletedAt: null,
      } as any);

      await expect(
        service.updateUserRole('user-001', { role: 'admin' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('suspendUser', () => {
    it('should suspend user successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        deletedAt: null,
      } as any);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      const suspendUntil = new Date('2024-12-31');
      const result = await service.suspendUser('user-001', {
        reason: 'Test reason',
        suspendUntil: suspendUntil.toISOString(),
      });

      expect(result.id).toBe('user-001');
      expect(result.status).toBe('suspended');
      expect(result.suspendedUntil).toBe(suspendUntil.toISOString());
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.suspendUser('non-existent', {
          reason: 'Test',
          suspendUntil: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('banUser', () => {
    it('should ban user successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        deletedAt: null,
      } as any);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      const result = await service.banUser('user-001', {
        reason: 'Violation',
      });

      expect(result.id).toBe('user-001');
      expect(result.status).toBe('banned');
      expect(result.banReason).toBe('Violation');
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-001',
        deletedAt: null,
      } as any);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      const result = await service.activateUser('user-001');

      expect(result.id).toBe('user-001');
      expect(result.status).toBe('active');
      expect(result.suspendedUntil).toBeNull();
      expect(result.banReason).toBeNull();
    });
  });
});


import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { AdminRoleGuard } from './admin-role.guard';
import { AdminErrors } from '../constants';
import { PrismaService } from '../../db/prisma.service';

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRoleGuard,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    guard = module.get<AdminRoleGuard>(AdminRoleGuard);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let context: ExecutionContext;
    let mockRequest: any;

    beforeEach(() => {
      mockRequest = {
        user: null,
      };

      context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as ExecutionContext;
    });

    it('should throw ForbiddenException when user is not found', async () => {
      mockRequest.user = null;

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        AdminErrors.AUTHENTICATION_REQUIRED.message,
      );
    });

    it('should throw ForbiddenException when user role is "user"', async () => {
      mockRequest.user = { id: 'user-001', role: 'user' };

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        AdminErrors.ADMIN_ROLE_REQUIRED.message,
      );
    });

    it('should allow access when user role is "admin"', async () => {
      mockRequest.user = { id: 'admin-001', role: 'admin' };

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user role is "operator"', async () => {
      mockRequest.user = { id: 'operator-001', role: 'operator' };

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should load role from database when user has no role', async () => {
      mockRequest.user = { id: 'user-001' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue({
        role: 'admin',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-001' },
        select: { role: true },
      });
      expect(mockRequest.user.role).toBe('admin');
    });

    it('should throw ForbiddenException when user not found in database', async () => {
      mockRequest.user = { id: 'user-001' };
      (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        AdminErrors.AUTHENTICATION_REQUIRED.message,
      );
    });

    it('should throw ForbiddenException when user role is empty string', async () => {
      mockRequest.user = { id: 'user-001', role: '' };

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user role is unknown', async () => {
      mockRequest.user = { id: 'user-001', role: 'unknown-role' };

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    });
  });
});



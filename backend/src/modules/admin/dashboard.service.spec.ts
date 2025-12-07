import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../db/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        count: jest.fn(),
      },
      refreshToken: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    prismaService = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock counts
      prismaService.user.count
        .mockResolvedValueOnce(17948) // totalUsers
        .mockResolvedValueOnce(15942) // totalUsers 30일 전
        .mockResolvedValueOnce(156) // todaySignups
        .mockResolvedValueOnce(160); // todaySignups 어제

      prismaService.refreshToken.findMany
        .mockResolvedValueOnce(
          Array.from({ length: 1247 }, (_, i) => ({ userId: `user-${i}` })),
        ) // activeSessions
        .mockResolvedValueOnce(
          Array.from({ length: 1152 }, (_, i) => ({ userId: `user-${i}` })),
        ); // activeSessions yesterday

      const result = await service.getDashboardStats();

      expect(result.totalUsers).toBe(17948);
      expect(result.activeSessions).toBe(1247);
      expect(result.todaySignups).toBe(156);
      expect(result.systemStatus).toBeDefined();
      expect(['healthy', 'warning', 'error']).toContain(result.systemStatus);
    });

    it('should use cache when called within cache TTL', async () => {
      prismaService.user.count.mockResolvedValue(17948);
      prismaService.refreshToken.findMany.mockResolvedValue([]);

      // First call
      await service.getDashboardStats();

      // Second call (should use cache)
      await service.getDashboardStats();

      // Should only call Prisma once (first time)
      expect(prismaService.user.count).toHaveBeenCalledTimes(4); // 4 queries in first call
    });

    it('should handle database errors gracefully', async () => {
      prismaService.user.count.mockRejectedValue(new Error('DB Error'));

      await expect(service.getDashboardStats()).rejects.toThrow(
        '대시보드 통계 조회에 실패했습니다.',
      );
    });
  });

  describe('getServers', () => {
    it('should return server status list', async () => {
      const result = await service.getServers();

      expect(result).toHaveLength(4);
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('status');
      expect(result[0]).toHaveProperty('cpu');
      expect(result[0]).toHaveProperty('memory');
      expect(result[0]).toHaveProperty('responseTime');
      expect(result[0]).toHaveProperty('connections');
      expect(result[0]).toHaveProperty('lastCheck');
    });

    it('should include Main API Server', async () => {
      const result = await service.getServers();

      const mainServer = result.find((s) => s.name === 'Main API Server');
      expect(mainServer).toBeDefined();
      expect(mainServer?.status).toBeDefined();
    });

    it('should return valid status values', async () => {
      const result = await service.getServers();

      result.forEach((server) => {
        expect(['healthy', 'warning', 'error']).toContain(server.status);
      });
    });

    it('should return valid metric ranges', async () => {
      const result = await service.getServers();

      result.forEach((server) => {
        expect(server.cpu).toBeGreaterThanOrEqual(0);
        expect(server.cpu).toBeLessThanOrEqual(100);
        expect(server.memory).toBeGreaterThanOrEqual(0);
        expect(server.memory).toBeLessThanOrEqual(100);
        expect(server.responseTime).toBeGreaterThan(0);
        if (server.connections !== undefined) {
          expect(server.connections).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});


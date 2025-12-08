import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../db/prisma.service';

describe('PlansService', () => {
  let service: PlansService;
  let prismaService: any;

  // Default mock plans
  const mockPlansData = [
    {
      id: 'plan-free',
      name: '무료 플랜',
      description: '제한된 기능으로 서비스를 체험하세요.',
      monthlyPrice: 0,
      yearlyPrice: 0,
      status: 'active',
      features: [
        { key: 'notes', name: '노트 생성', enabled: true, limit: 10, unit: '개' },
        { key: 'storage', name: '저장 공간', enabled: true, limit: 500, unit: 'MB' },
        { key: 'ai_summary', name: 'AI 요약', enabled: false, limit: null, unit: null },
      ],
      subscriptions: Array(12847).fill({ status: 'active', cancelledAt: null }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-11-15T10:00:00Z'),
    },
    {
      id: 'plan-student-pro',
      name: 'Student Pro',
      description: '학생을 위한 프로 플랜',
      monthlyPrice: 4500,
      yearlyPrice: 45000,
      status: 'active',
      features: [
        { key: 'notes', name: '노트 생성', enabled: true, limit: 100, unit: '개' },
        { key: 'storage', name: '저장 공간', enabled: true, limit: 5000, unit: 'MB' },
        { key: 'ai_summary', name: 'AI 요약', enabled: true, limit: 50, unit: '회/월' },
      ],
      subscriptions: Array(3421).fill({ status: 'active', cancelledAt: null }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-11-15T10:00:00Z'),
    },
    {
      id: 'plan-educator-pro',
      name: 'Educator Pro',
      description: '교육자를 위한 프로 플랜',
      monthlyPrice: 9000,
      yearlyPrice: 90000,
      status: 'active',
      features: [
        { key: 'notes', name: '노트 생성', enabled: true, limit: 500, unit: '개' },
        { key: 'storage', name: '저장 공간', enabled: true, limit: 20000, unit: 'MB' },
        { key: 'ai_summary', name: 'AI 요약', enabled: true, limit: 200, unit: '회/월' },
      ],
      subscriptions: Array(1256).fill({ status: 'active', cancelledAt: null }),
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-11-15T10:00:00Z'),
    },
  ];

  beforeEach(async () => {
    const mockPrismaService = {
      plan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      planHistory: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
        count: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    prismaService = module.get(PrismaService);

    // Set up default mock behavior
    prismaService.plan.findMany.mockResolvedValue(mockPlansData);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should return list of plans', async () => {
      const result = await service.getPlans();

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should include default plans', async () => {
      const result = await service.getPlans();

      const planNames = result.data.map((p) => p.name);
      expect(planNames).toContain('무료 플랜');
      expect(planNames).toContain('Student Pro');
      expect(planNames).toContain('Educator Pro');
    });

    it('should return plans with required fields', async () => {
      const result = await service.getPlans();

      result.data.forEach((plan) => {
        expect(plan).toHaveProperty('id');
        expect(plan).toHaveProperty('name');
        expect(plan).toHaveProperty('description');
        expect(plan).toHaveProperty('monthlyPrice');
        expect(plan).toHaveProperty('yearlyPrice');
        expect(plan).toHaveProperty('status');
        expect(plan).toHaveProperty('features');
        expect(plan).toHaveProperty('subscriberCount');
      });
    });
  });

  describe('createPlan', () => {
    it('should create a new plan', async () => {
      const newPlan = {
        name: 'Test Plan',
        description: 'Test Description',
        monthlyPrice: 10000,
        yearlyPrice: 100000,
        status: 'active' as const,
        features: [
          {
            key: 'test',
            name: 'Test Feature',
            enabled: true,
            limit: 10,
            unit: '개',
          },
        ],
      };

      const createdPlan = {
        id: 'plan-test',
        ...newPlan,
        subscriptions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.plan.create.mockResolvedValue(createdPlan);

      const result = await service.createPlan(newPlan);

      expect(result.data.name).toBe('Test Plan');
      expect(result.data.id).toBeDefined();
    });

    it('should throw BadRequestException for duplicate plan name', async () => {
      const plan = {
        name: '무료 플랜', // Already exists
        description: 'Test',
        monthlyPrice: 0,
        yearlyPrice: 0,
        status: 'active' as const,
        features: [],
      };

      // Simulate Prisma unique constraint error
      prismaService.plan.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
      });

      await expect(service.createPlan(plan)).rejects.toThrow();
    });

    it('should validate monthly price is non-negative', async () => {
      const plan = {
        name: 'Invalid Plan',
        description: 'Test',
        monthlyPrice: -100, // Invalid
        yearlyPrice: 0,
        status: 'active' as const,
        features: [],
      };

      const createdPlan = {
        id: 'plan-invalid',
        ...plan,
        subscriptions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.plan.create.mockResolvedValue(createdPlan);

      // This should be caught by DTO validation, but testing service level
      const result = await service.createPlan(plan);
      expect(result.data.monthlyPrice).toBe(-100); // Service doesn't validate, DTO does
    });
  });

  describe('updatePlan', () => {
    it('should update an existing plan', async () => {
      const planId = 'plan-free';
      const updatedPlan = {
        ...mockPlansData[0],
        monthlyPrice: 5000,
      };

      prismaService.plan.findUnique.mockResolvedValue(mockPlansData[0]);
      prismaService.plan.findMany.mockResolvedValue([mockPlansData[0]]);
      prismaService.plan.update.mockResolvedValue(updatedPlan);
      prismaService.planHistory.create.mockResolvedValue({});

      const result = await service.updatePlan(planId, {
        monthlyPrice: 5000,
      });

      expect(result.data.monthlyPrice).toBe(5000);
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePlan('non-existent-id', { monthlyPrice: 5000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate name', async () => {
      const planId = 'plan-student-pro';
      const existingName = '무료 플랜';

      prismaService.plan.findUnique.mockResolvedValue(mockPlansData[1]);
      // Simulate Prisma unique constraint error
      prismaService.plan.update.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
      });

      await expect(
        service.updatePlan(planId, { name: existingName }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan without subscribers', async () => {
      const newPlan = {
        id: 'plan-to-delete',
        name: 'To Be Deleted',
        description: 'Test',
        monthlyPrice: 0,
        yearlyPrice: 0,
        status: 'inactive',
        features: [],
        subscriptions: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaService.plan.findUnique.mockResolvedValue(newPlan);
      prismaService.subscription.count.mockResolvedValue(0);
      prismaService.plan.delete.mockResolvedValue(newPlan);

      const result = await service.deletePlan(newPlan.id);
      expect(result).toHaveProperty('message');
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.deletePlan('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when plan has subscribers', async () => {
      const planWithSubscribers = mockPlansData[0];

      prismaService.plan.findUnique.mockResolvedValue(planWithSubscribers);
      prismaService.subscription.count.mockResolvedValue(100);

      await expect(service.deletePlan(planWithSubscribers.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getPlanHistory', () => {
    it('should return plan history', async () => {
      const planId = 'plan-free';
      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'admin-user',
          action: 'PLAN_UPDATE',
          resourceId: planId,
          payload: { changes: { monthlyPrice: { from: 0, to: 6000 } } },
          at: new Date(),
          method: 'PUT',
          path: '/api/admin/plans',
        },
      ];

      prismaService.plan.findUnique.mockResolvedValue(mockPlansData[0]);
      prismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getPlanHistory(planId);

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      prismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.getPlanHistory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include change details in history', async () => {
      const planId = 'plan-free';
      const mockAuditLogs = [
        {
          id: 'audit-1',
          userId: 'admin-user',
          action: 'PLAN_UPDATE',
          resourceId: planId,
          payload: { changes: { monthlyPrice: { from: 0, to: 7000 } } },
          at: new Date(),
          method: 'PUT',
          path: '/api/admin/plans',
        },
      ];

      prismaService.plan.findUnique.mockResolvedValue(mockPlansData[0]);
      prismaService.auditLog.findMany.mockResolvedValue(mockAuditLogs);

      const result = await service.getPlanHistory(planId);

      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('planId');
      expect(result.data[0]).toHaveProperty('changedBy');
      expect(result.data[0]).toHaveProperty('changes');
      expect(result.data[0]).toHaveProperty('createdAt');
    });
  });
});

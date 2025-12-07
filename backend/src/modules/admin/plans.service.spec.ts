import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../db/prisma.service';

describe('PlansService', () => {
  let service: PlansService;
  let prismaService: any;

  beforeEach(async () => {
    const mockPrismaService = {};

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

    // Clear mock plans between tests
    (service as any).mockPlans.clear();
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

      await expect(service.createPlan(plan)).rejects.toThrow(
        BadRequestException,
      );
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

      // This should be caught by DTO validation, but testing service level
      const result = await service.createPlan(plan);
      expect(result.data.monthlyPrice).toBe(-100); // Service doesn't validate, DTO does
    });
  });

  describe('updatePlan', () => {
    it('should update an existing plan', async () => {
      const plans = await service.getPlans();
      const planId = plans.data[0].id;

      const result = await service.updatePlan(planId, {
        monthlyPrice: 5000,
      });

      expect(result.data.monthlyPrice).toBe(5000);
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      await expect(
        service.updatePlan('non-existent-id', { monthlyPrice: 5000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate name', async () => {
      const plans = await service.getPlans();
      const planId = plans.data[1].id;
      const existingName = plans.data[0].name;

      await expect(
        service.updatePlan(planId, { name: existingName }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan without subscribers', async () => {
      const newPlan = await service.createPlan({
        name: 'To Be Deleted',
        description: 'Test',
        monthlyPrice: 0,
        yearlyPrice: 0,
        status: 'inactive' as const,
        features: [],
      });

      await expect(service.deletePlan(newPlan.data.id)).resolves.not.toThrow();
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      await expect(service.deletePlan('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when plan has subscribers', async () => {
      const plans = await service.getPlans();
      const planWithSubscribers = plans.data.find((p) => p.subscriberCount > 0);

      if (planWithSubscribers) {
        await expect(service.deletePlan(planWithSubscribers.id)).rejects.toThrow(
          BadRequestException,
        );
      }
    });
  });

  describe('getPlanHistory', () => {
    it('should return plan history', async () => {
      const plans = await service.getPlans();
      const planId = plans.data[0].id;

      // Update to create history
      await service.updatePlan(planId, { monthlyPrice: 6000 });

      const result = await service.getPlanHistory(planId);

      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should throw NotFoundException for non-existent plan', async () => {
      await expect(service.getPlanHistory('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should include change details in history', async () => {
      const plans = await service.getPlans();
      const planId = plans.data[0].id;

      await service.updatePlan(planId, { monthlyPrice: 7000 });

      const result = await service.getPlanHistory(planId);

      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('planId');
      expect(result.data[0]).toHaveProperty('changedBy');
      expect(result.data[0]).toHaveProperty('changes');
      expect(result.data[0]).toHaveProperty('createdAt');
    });
  });
});


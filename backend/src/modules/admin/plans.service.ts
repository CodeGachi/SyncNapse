import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreatePlanDto, UpdatePlanDto, PlanDto, PlanHistoryDto, PlanChangeDto } from './dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  // Mock 데이터 (실제 Plan 테이블이 없으므로)
  private mockPlans: Map<string, any> = new Map([
    ['plan-free', {
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
      subscriberCount: 12847,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-11-15T10:00:00Z',
    }],
    ['plan-student-pro', {
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
      subscriberCount: 3421,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-11-15T10:00:00Z',
    }],
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 요금제 목록 조회
   * GET /api/admin/plans
   */
  async getPlans(): Promise<{ data: PlanDto[] }> {
    this.logger.debug('getPlans');

    try {
      const plans = Array.from(this.mockPlans.values()).map(
        (plan) => new PlanDto(plan)
      );

      return { data: plans };
    } catch (error) {
      this.logger.error('Failed to get plans', error);
      throw new InternalServerErrorException('요금제 목록 조회에 실패했습니다.');
    }
  }

  /**
   * 요금제 생성
   * POST /api/admin/plans
   */
  async createPlan(dto: CreatePlanDto): Promise<{ data: PlanDto }> {
    this.logger.debug(`createPlan name=${dto.name}`);

    try {
      // 이름 중복 체크
      const existingPlan = Array.from(this.mockPlans.values()).find(
        (p) => p.name === dto.name,
      );
      
      if (existingPlan) {
        throw new BadRequestException('이미 존재하는 요금제 이름입니다.');
      }

      // ID 생성 (unique ID 보장)
      const id = `plan-${Date.now()}-${dto.name.toLowerCase().replace(/\s+/g, '-')}`;

      const now = new Date().toISOString();
      const newPlan = {
        id,
        ...dto,
        subscriberCount: 0,
        createdAt: now,
        updatedAt: now,
      };

      this.mockPlans.set(id, newPlan);

      this.logger.log(`Plan created: ${id}`);

      return { data: new PlanDto(newPlan) };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to create plan', error);
      throw new InternalServerErrorException('요금제 생성에 실패했습니다.');
    }
  }

  /**
   * 요금제 수정
   * PUT /api/admin/plans/:planId
   */
  async updatePlan(planId: string, dto: UpdatePlanDto): Promise<{ data: PlanDto }> {
    this.logger.debug(`updatePlan planId=${planId}`);

    try {
      const plan = this.mockPlans.get(planId);

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // 이름 변경 시 중복 체크
      if (dto.name && dto.name !== plan.name) {
        const existingPlan = Array.from(this.mockPlans.values()).find(
          (p) => p.name === dto.name && p.id !== planId,
        );
        
        if (existingPlan) {
          throw new BadRequestException('이미 존재하는 요금제 이름입니다.');
        }
      }

      // 업데이트
      const updatedPlan = {
        ...plan,
        ...dto,
        updatedAt: new Date().toISOString(),
      };

      this.mockPlans.set(planId, updatedPlan);

      this.logger.log(`Plan updated: ${planId}`);

      return { data: new PlanDto(updatedPlan) };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to update plan', error);
      throw new InternalServerErrorException('요금제 수정에 실패했습니다.');
    }
  }

  /**
   * 요금제 삭제
   * DELETE /api/admin/plans/:planId
   */
  async deletePlan(planId: string): Promise<{ message: string }> {
    this.logger.debug(`deletePlan planId=${planId}`);

    try {
      const plan = this.mockPlans.get(planId);

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // 구독자가 있는지 체크
      if (plan.subscriberCount > 0) {
        throw new BadRequestException('구독자가 있는 요금제는 삭제할 수 없습니다.');
      }

      this.mockPlans.delete(planId);

      this.logger.log(`Plan deleted: ${planId}`);

      return { message: '요금제가 삭제되었습니다.' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Failed to delete plan', error);
      throw new InternalServerErrorException('요금제 삭제에 실패했습니다.');
    }
  }

  /**
   * 요금제 변경 이력 조회
   * GET /api/admin/plans/:planId/history
   */
  async getPlanHistory(planId: string): Promise<{ data: PlanHistoryDto[] }> {
    this.logger.debug(`getPlanHistory planId=${planId}`);

    try {
      const plan = this.mockPlans.get(planId);

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // Mock 이력 데이터
      const history: PlanHistoryDto[] = [
        new PlanHistoryDto({
          id: 'history-001',
          planId,
          changedBy: 'user-admin',
          changedByName: '시스템 관리자',
          changes: [
            { field: 'monthlyPrice', oldValue: 4000, newValue: 4500 },
            { field: 'yearlyPrice', oldValue: 40000, newValue: 45000 },
          ],
          createdAt: '2024-11-01T09:00:00Z',
        }),
        new PlanHistoryDto({
          id: 'history-002',
          planId,
          changedBy: 'user-admin',
          changedByName: '시스템 관리자',
          changes: [
            { field: 'description', oldValue: '학생용 플랜', newValue: '학생을 위한 프로 플랜' },
          ],
          createdAt: '2024-10-15T14:30:00Z',
        }),
      ];

      return { data: history };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to get plan history', error);
      throw new InternalServerErrorException('요금제 변경 이력 조회에 실패했습니다.');
    }
  }
}


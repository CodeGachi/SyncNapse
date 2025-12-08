import { Injectable, Logger, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../db/prisma.service';
import { CreatePlanDto, UpdatePlanDto, PlanDto, PlanHistoryDto, PlanChangeDto } from './dto';

@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 요금제 목록 조회
   * GET /api/admin/plans
   */
  async getPlans(): Promise<{ data: PlanDto[] }> {
    this.logger.debug('getPlans');

    try {
      const plans = await this.prisma.plan.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      const data = plans.map((plan) => new PlanDto({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        monthlyPrice: plan.monthlyPrice,
        yearlyPrice: plan.yearlyPrice,
        status: plan.status,
        features: plan.features as any,
        subscriberCount: plan.subscriptions.length,
        createdAt: plan.createdAt.toISOString(),
        updatedAt: plan.updatedAt.toISOString(),
      }));

      return { data };
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
      // Prisma가 자동으로 ID 생성하도록 함 (cuid)
      // 이름 중복은 DB의 @unique 제약으로 처리
      const newPlan = await this.prisma.plan.create({
        data: {
          name: dto.name,
          description: dto.description,
          monthlyPrice: dto.monthlyPrice,
          yearlyPrice: dto.yearlyPrice,
          status: dto.status,
          features: dto.features as any,
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      this.logger.log(`Plan created: ${newPlan.id}`);

      return {
        data: new PlanDto({
          id: newPlan.id,
          name: newPlan.name,
          description: newPlan.description,
          monthlyPrice: newPlan.monthlyPrice,
          yearlyPrice: newPlan.yearlyPrice,
          status: newPlan.status,
          features: newPlan.features as any,
          subscriberCount: newPlan.subscriptions.length,
          createdAt: newPlan.createdAt.toISOString(),
          updatedAt: newPlan.updatedAt.toISOString(),
        }),
      };
    } catch (error: any) {
      // Prisma unique constraint 에러 처리
      if (error?.code === 'P2002') {
        throw new BadRequestException('이미 존재하는 요금제 이름입니다.');
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
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // 이름 변경 시 중복 체크는 Prisma unique constraint가 처리

      // 업데이트
      const updatedPlan = await this.prisma.plan.update({
        where: { id: planId },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.description && { description: dto.description }),
          ...(dto.monthlyPrice !== undefined && { monthlyPrice: dto.monthlyPrice }),
          ...(dto.yearlyPrice !== undefined && { yearlyPrice: dto.yearlyPrice }),
          ...(dto.status && { status: dto.status }),
          ...(dto.features && { features: dto.features as any }),
        },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      this.logger.log(`Plan updated: ${planId}`);

      return {
        data: new PlanDto({
          id: updatedPlan.id,
          name: updatedPlan.name,
          description: updatedPlan.description,
          monthlyPrice: updatedPlan.monthlyPrice,
          yearlyPrice: updatedPlan.yearlyPrice,
          status: updatedPlan.status,
          features: updatedPlan.features as any,
          subscriberCount: updatedPlan.subscriptions.length,
          createdAt: updatedPlan.createdAt.toISOString(),
          updatedAt: updatedPlan.updatedAt.toISOString(),
        }),
      };
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // Prisma unique constraint 에러 처리
      if (error?.code === 'P2002') {
        throw new BadRequestException('이미 존재하는 요금제 이름입니다.');
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
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
        include: {
          subscriptions: {
            where: {
              status: 'active',
              cancelledAt: null,
            },
          },
        },
      });

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // 구독자가 있는지 체크
      if (plan.subscriptions.length > 0) {
        throw new BadRequestException('구독자가 있는 요금제는 삭제할 수 없습니다.');
      }

      await this.prisma.plan.delete({
        where: { id: planId },
      });

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
      const plan = await this.prisma.plan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        throw new NotFoundException('요금제를 찾을 수 없습니다.');
      }

      // 실제 이력 테이블이 없으므로 AuditLog에서 추출
      // TODO: 실제 PlanHistory 테이블이 추가되면 해당 테이블 사용
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          action: 'PLAN_UPDATE',
          resourceId: planId,
        },
        orderBy: { at: 'desc' },
        take: 20,
      });

      const history: PlanHistoryDto[] = auditLogs.map((log) => {
        const payload = log.payload as any;
        return new PlanHistoryDto({
          id: log.id,
          planId,
          changedBy: log.userId || 'system',
          changedByName: '시스템 관리자', // TODO: User 테이블에서 이름 조회
          changes: payload?.changes || [],
          createdAt: log.at.toISOString(),
        });
      });

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


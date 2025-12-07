import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOnlyGuard } from './guards/admin-only.guard';
import { AdminRoleGuard } from './guards';
import { PlansService } from './plans.service';
import { CreatePlanDto, UpdatePlanDto, PlanDto, PlanHistoryDto } from './dto';

/**
 * Plans Controller (Admin)
 * Base URL: /api/admin/plans
 * 
 * 관리자용 요금제 관리
 */
@ApiTags('Admin - Plans')
@ApiBearerAuth()
@Controller('admin/plans')
@UseGuards(JwtAuthGuard, AdminRoleGuard)
export class PlansController {
  private readonly logger = new Logger(PlansController.name);

  constructor(private readonly plansService: PlansService) {}

  /**
   * 요금제 목록 조회
   * GET /api/admin/plans
   */
  @Get()
  @ApiOperation({
    summary: '요금제 목록 조회',
    description: '모든 요금제 목록을 조회합니다.',
  })
  @ApiResponse({
    status: 200,
    description: '요금제 목록 조회 성공',
    type: [PlanDto],
  })
  async getPlans(): Promise<{ data: PlanDto[] }> {
    this.logger.debug('GET /api/admin/plans');
    return await this.plansService.getPlans();
  }

  /**
   * 요금제 생성
   * POST /api/admin/plans
   */
  @Post()
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '요금제 생성',
    description: '새로운 요금제를 생성합니다. (admin 권한 필요)',
  })
  @ApiResponse({
    status: 201,
    description: '요금제 생성 성공',
    type: PlanDto,
  })
  @ApiResponse({
    status: 400,
    description: '잘못된 요청 또는 중복된 요금제 이름',
  })
  async createPlan(@Body() dto: CreatePlanDto): Promise<{ data: PlanDto }> {
    this.logger.debug(`POST /api/admin/plans name=${dto.name}`);
    return await this.plansService.createPlan(dto);
  }

  /**
   * 요금제 수정
   * PUT /api/admin/plans/:planId
   */
  @Put(':planId')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '요금제 수정',
    description: '요금제 정보를 수정합니다. (admin 권한 필요)',
  })
  @ApiParam({ name: 'planId', description: '요금제 ID', example: 'plan-free' })
  @ApiResponse({
    status: 200,
    description: '요금제 수정 성공',
    type: PlanDto,
  })
  @ApiResponse({
    status: 404,
    description: '요금제를 찾을 수 없음',
  })
  async updatePlan(
    @Param('planId') planId: string,
    @Body() dto: UpdatePlanDto,
  ): Promise<{ data: PlanDto }> {
    this.logger.debug(`PUT /api/admin/plans/${planId}`);
    return await this.plansService.updatePlan(planId, dto);
  }

  /**
   * 요금제 삭제
   * DELETE /api/admin/plans/:planId
   */
  @Delete(':planId')
  @UseGuards(JwtAuthGuard, AdminOnlyGuard)
  @ApiOperation({
    summary: '요금제 삭제',
    description: '요금제를 삭제합니다. 구독자가 있는 경우 삭제할 수 없습니다. (admin 권한 필요)',
  })
  @ApiParam({ name: 'planId', description: '요금제 ID', example: 'plan-free' })
  @ApiResponse({
    status: 200,
    description: '요금제 삭제 성공',
  })
  @ApiResponse({
    status: 400,
    description: '구독자가 있어 삭제할 수 없음',
  })
  @ApiResponse({
    status: 404,
    description: '요금제를 찾을 수 없음',
  })
  async deletePlan(@Param('planId') planId: string): Promise<{ message: string }> {
    this.logger.debug(`DELETE /api/admin/plans/${planId}`);
    return await this.plansService.deletePlan(planId);
  }

  /**
   * 요금제 변경 이력 조회
   * GET /api/admin/plans/:planId/history
   */
  @Get(':planId/history')
  @ApiOperation({
    summary: '요금제 변경 이력 조회',
    description: '요금제의 변경 이력을 조회합니다.',
  })
  @ApiParam({ name: 'planId', description: '요금제 ID', example: 'plan-student-pro' })
  @ApiResponse({
    status: 200,
    description: '변경 이력 조회 성공',
    type: [PlanHistoryDto],
  })
  @ApiResponse({
    status: 404,
    description: '요금제를 찾을 수 없음',
  })
  async getPlanHistory(@Param('planId') planId: string): Promise<{ data: PlanHistoryDto[] }> {
    this.logger.debug(`GET /api/admin/plans/${planId}/history`);
    return await this.plansService.getPlanHistory(planId);
  }
}


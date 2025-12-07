/**
 * 5.6 요금제 분포 항목
 */
export class PlanDistributionDto {
  @ApiProperty({ description: '요금제 ID', example: 'plan-free' })
  planId!: string;

  @ApiProperty({ description: '요금제 이름', example: '무료 플랜' })
  planName!: string;

  @ApiProperty({ description: '사용자 수', example: 12847 })
  userCount!: number;

  @ApiProperty({ description: '비율 (%)', example: 71.6 })
  percentage!: number;
}


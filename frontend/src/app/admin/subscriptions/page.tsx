"use client";

import { useEffect, useState } from "react";
import {
  Title,
  Paper,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Select,
  SegmentedControl,
  Table,
  Badge,
  Box,
  RingProgress,
  Center,
} from "@mantine/core";
import {
  IconCurrencyWon,
  IconUsers,
  IconRepeat,
  IconTrendingDown,
} from "@tabler/icons-react";
import { StatCard, SubscriptionStatusBadge } from "@/components/admin/common";
import {
  mockSubscriptionStats,
  mockRevenueData,
  mockPlanAnalytics,
  mockChurnAnalysis,
  mockSubscriptions,
  mockPlanDistribution,
  mockDelay,
} from "@/lib/mock/admin.mock";
import type {
  SubscriptionStats,
  RevenueData,
  PlanAnalytics,
  ChurnAnalysis,
  Subscription,
  PlanDistribution,
} from "@/lib/api/types/admin.types";

/**
 * 구독 분석 페이지 (US 7.3)
 *
 * - 구독 통계 개요
 * - 수익 추이 차트
 * - 요금제별 분석
 * - 이탈 분석
 * - 최근 구독 목록
 */
export default function AdminSubscriptionsPage() {
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [planAnalytics, setPlanAnalytics] = useState<PlanAnalytics[]>([]);
  const [churnAnalysis, setChurnAnalysis] = useState<ChurnAnalysis | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  // 필터
  const [period, setPeriod] = useState("6m");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        await mockDelay(500);
        setStats(mockSubscriptionStats);
        setRevenueData(mockRevenueData);
        setPlanAnalytics(mockPlanAnalytics);
        setChurnAnalysis(mockChurnAnalysis);
        setSubscriptions(mockSubscriptions);
        setPlanDistribution(mockPlanDistribution);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [period]);

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2} c="white">
          구독 분석
        </Title>
        <SegmentedControl
          value={period}
          onChange={setPeriod}
          data={[
            { label: "1개월", value: "1m" },
            { label: "3개월", value: "3m" },
            { label: "6개월", value: "6m" },
            { label: "1년", value: "1y" },
          ]}
          size="xs"
        />
      </Group>

      {/* 통계 카드 */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          title="총 수익"
          value={formatCurrency(stats?.totalRevenue ?? 0)}
          change={stats?.totalRevenueChange}
          icon={<IconCurrencyWon size={20} />}
          iconColor="green"
          loading={loading}
        />
        <StatCard
          title="구독자 수"
          value={stats?.subscriberCount ?? 0}
          change={stats?.subscriberCountChange}
          icon={<IconUsers size={20} />}
          iconColor="blue"
          loading={loading}
        />
        <StatCard
          title="MRR"
          value={formatCurrency(stats?.mrr ?? 0)}
          change={stats?.mrrChange}
          icon={<IconRepeat size={20} />}
          iconColor="violet"
          description="월 반복 매출"
          loading={loading}
        />
        <StatCard
          title="이탈률"
          value={`${stats?.churnRate ?? 0}%`}
          change={stats?.churnRateChange}
          icon={<IconTrendingDown size={20} />}
          iconColor="red"
          loading={loading}
        />
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* 수익 추이 (차트 대신 테이블) */}
        <Paper
          p="md"
          radius="md"
          bg="dark.7"
          style={{ border: "1px solid var(--mantine-color-dark-5)" }}
        >
          <Text fw={600} c="white" mb="md">
            수익 추이
          </Text>
          {loading ? (
            <Box h={200} bg="dark.6" style={{ borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>월</Table.Th>
                  <Table.Th ta="right">수익</Table.Th>
                  <Table.Th ta="right">구독자</Table.Th>
                  <Table.Th ta="right">신규</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {revenueData.map((item) => (
                  <Table.Tr key={item.date}>
                    <Table.Td>
                      <Text size="sm">{item.date}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{formatCurrency(item.revenue)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{item.subscriptions.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" c="green">
                        +{item.newSubscriptions?.toLocaleString()}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* 요금제 분포 */}
        <Paper
          p="md"
          radius="md"
          bg="dark.7"
          style={{ border: "1px solid var(--mantine-color-dark-5)" }}
        >
          <Text fw={600} c="white" mb="md">
            요금제 분포
          </Text>
          {loading ? (
            <Box h={200} bg="dark.6" style={{ borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          ) : (
            <Group align="center" justify="center" gap="xl">
              <RingProgress
                size={180}
                thickness={20}
                sections={planDistribution.map((p, i) => ({
                  value: p.percentage,
                  color: PLAN_COLORS[i % PLAN_COLORS.length],
                  tooltip: `${p.planName}: ${p.percentage}%`,
                }))}
                label={
                  <Center>
                    <Stack gap={0} align="center">
                      <Text size="xl" fw={700} c="white">
                        {planDistribution.reduce((sum, p) => sum + p.userCount, 0).toLocaleString()}
                      </Text>
                      <Text size="xs" c="dimmed">총 사용자</Text>
                    </Stack>
                  </Center>
                }
              />
              <Stack gap="xs">
                {planDistribution.map((p, i) => (
                  <Group key={p.planId} gap="sm">
                    <Box
                      w={12}
                      h={12}
                      bg={PLAN_COLORS[i % PLAN_COLORS.length]}
                      style={{ borderRadius: 2 }}
                    />
                    <Text size="sm" c="white" w={100}>
                      {p.planName}
                    </Text>
                    <Text size="sm" c="dimmed">
                      {p.userCount.toLocaleString()}명 ({p.percentage}%)
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Group>
          )}
        </Paper>
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        {/* 요금제별 분석 */}
        <Paper
          p="md"
          radius="md"
          bg="dark.7"
          style={{ border: "1px solid var(--mantine-color-dark-5)" }}
        >
          <Text fw={600} c="white" mb="md">
            요금제별 분석
          </Text>
          {loading ? (
            <Box h={200} bg="dark.6" style={{ borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          ) : (
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>요금제</Table.Th>
                  <Table.Th ta="right">구독자</Table.Th>
                  <Table.Th ta="right">수익</Table.Th>
                  <Table.Th ta="right">변화</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {planAnalytics.map((item) => (
                  <Table.Tr key={item.planId}>
                    <Table.Td>
                      <Text size="sm" fw={500}>{item.planName}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{item.subscribers.toLocaleString()}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{formatCurrency(item.revenue)}</Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" c={item.change >= 0 ? "green" : "red"}>
                        {item.change >= 0 ? "+" : ""}{item.change}%
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Paper>

        {/* 이탈 분석 */}
        <Paper
          p="md"
          radius="md"
          bg="dark.7"
          style={{ border: "1px solid var(--mantine-color-dark-5)" }}
        >
          <Text fw={600} c="white" mb="md">
            이탈 분석
          </Text>
          {loading ? (
            <Box h={200} bg="dark.6" style={{ borderRadius: 8, animation: "pulse 1.5s infinite" }} />
          ) : churnAnalysis ? (
            <Stack gap="md">
              <Group gap="xl">
                <Box>
                  <Text size="xs" c="dimmed">이탈 수</Text>
                  <Text size="xl" fw={700} c="white">
                    {churnAnalysis.totalChurned}명
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">이탈률</Text>
                  <Text size="xl" fw={700} c="red">
                    {churnAnalysis.churnRate}%
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed">손실 매출</Text>
                  <Text size="xl" fw={700} c="white">
                    {formatCurrency(churnAnalysis.revenueLost || 0)}
                  </Text>
                </Box>
              </Group>

              <Text size="sm" c="dimmed" fw={500}>이탈 사유</Text>
              <Stack gap="xs">
                {churnAnalysis.reasons.map((reason) => (
                  <Group key={reason.reason} justify="space-between">
                    <Text size="sm" c="white">{reason.label}</Text>
                    <Group gap="xs">
                      <Text size="sm" c="dimmed">{reason.count}명</Text>
                      <Badge size="sm" variant="light">
                        {reason.percentage}%
                      </Badge>
                    </Group>
                  </Group>
                ))}
              </Stack>
            </Stack>
          ) : null}
        </Paper>
      </SimpleGrid>

      {/* 최근 구독 목록 */}
      <Paper
        p="md"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Text fw={600} c="white" mb="md">
          최근 구독
        </Text>
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>사용자</Table.Th>
                <Table.Th>요금제</Table.Th>
                <Table.Th>상태</Table.Th>
                <Table.Th>결제 주기</Table.Th>
                <Table.Th ta="right">금액</Table.Th>
                <Table.Th>다음 결제일</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={6}>
                      <Box
                        h={40}
                        bg="dark.6"
                        style={{ borderRadius: 4, animation: "pulse 1.5s infinite" }}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : (
                subscriptions.map((sub) => (
                  <Table.Tr key={sub.id}>
                    <Table.Td>
                      <Box>
                        <Text size="sm" fw={500}>{sub.userName}</Text>
                        <Text size="xs" c="dimmed">{sub.userEmail}</Text>
                      </Box>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="outline">{sub.planName}</Badge>
                    </Table.Td>
                    <Table.Td>
                      <SubscriptionStatusBadge status={sub.status} size="sm" />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {sub.billingCycle === "monthly" ? "월간" : "연간"}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm">{formatCurrency(sub.amount)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {sub.status === "cancelled"
                          ? "-"
                          : formatDate(sub.currentPeriodEnd)}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Paper>
    </Stack>
  );
}

const PLAN_COLORS = ["blue", "green", "violet", "orange", "cyan"];

function formatCurrency(value: number): string {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}억원`;
  }
  if (value >= 10000) {
    return `${(value / 10000).toFixed(0)}만원`;
  }
  return `${value.toLocaleString()}원`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

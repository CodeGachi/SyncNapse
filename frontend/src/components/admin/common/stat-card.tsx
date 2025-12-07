"use client";

import { Paper, Group, Text, ThemeIcon, Box } from "@mantine/core";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import type { ReactNode } from "react";

interface StatCardProps {
  /** 카드 제목 */
  title: string;
  /** 메인 값 (숫자 또는 포맷된 문자열) */
  value: string | number;
  /** 변화율 (퍼센트) */
  change?: number;
  /** 아이콘 */
  icon?: ReactNode;
  /** 아이콘 배경색 */
  iconColor?: string;
  /** 추가 설명 */
  description?: string;
  /** 로딩 상태 */
  loading?: boolean;
}

/**
 * 통계 카드 컴포넌트
 *
 * 대시보드에서 주요 지표를 표시하는 데 사용
 */
export function StatCard({
  title,
  value,
  change,
  icon,
  iconColor = "blue",
  description,
  loading = false,
}: StatCardProps) {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === undefined || change === 0;

  const TrendIcon = isPositive
    ? IconTrendingUp
    : isNegative
    ? IconTrendingDown
    : IconMinus;

  const trendColor = isPositive ? "teal" : isNegative ? "red" : "gray";

  return (
    <Paper
      p="md"
      radius="md"
      bg="dark.7"
      style={{
        border: "1px solid var(--mantine-color-dark-5)",
      }}
    >
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed" fw={500}>
          {title}
        </Text>
        {icon && (
          <ThemeIcon
            size="lg"
            radius="md"
            variant="light"
            color={iconColor}
          >
            {icon}
          </ThemeIcon>
        )}
      </Group>

      <Box>
        {loading ? (
          <Box
            h={32}
            bg="dark.5"
            style={{ borderRadius: 4, animation: "pulse 1.5s infinite" }}
          />
        ) : (
          <Text size="xl" fw={700} c="white" lh={1.2}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </Text>
        )}
      </Box>

      {(change !== undefined || description) && (
        <Group gap="xs" mt="sm">
          {change !== undefined && !loading && (
            <Group gap={4}>
              <TrendIcon size={16} color={`var(--mantine-color-${trendColor}-5)`} />
              <Text size="xs" c={trendColor} fw={500}>
                {isPositive && "+"}
                {change.toFixed(1)}%
              </Text>
            </Group>
          )}
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Group>
      )}
    </Paper>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Title,
  Paper,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Progress,
  Box,
} from "@mantine/core";
import {
  IconUsers,
  IconActivity,
  IconUserPlus,
  IconServer,
} from "@tabler/icons-react";
import { StatCard, ServerStatusBadge } from "@/components/admin/common";
import {
  mockDashboardStats,
  mockServerStatus,
  mockDelay,
  isMockEnabled,
} from "@/lib/mock/admin.mock";
import type { DashboardStats, ServerStatus } from "@/lib/api/types/admin.types";

/**
 * 운영 대시보드 페이지 (US 7.2)
 *
 * - 시스템 상태 개요
 * - 서버 상태 모니터링
 */
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (isMockEnabled() || true) {
          // 항상 Mock 사용 (백엔드 미구현)
          await mockDelay(500);
          setStats(mockDashboardStats);
          setServers(mockServerStatus);
        }
        // TODO: 실제 API 호출 구현
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Stack gap="lg">
      <Title order={2} c="white">
        운영 대시보드
      </Title>

      {/* 통계 카드 */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        <StatCard
          title="전체 사용자"
          value={stats?.totalUsers ?? 0}
          change={stats?.totalUsersChange}
          icon={<IconUsers size={20} />}
          iconColor="blue"
          description="전체 등록 사용자"
          loading={loading}
        />
        <StatCard
          title="활성 세션"
          value={stats?.activeSessions ?? 0}
          change={stats?.activeSessionsChange}
          icon={<IconActivity size={20} />}
          iconColor="green"
          description="현재 접속 중"
          loading={loading}
        />
        <StatCard
          title="오늘 가입"
          value={stats?.todaySignups ?? 0}
          change={stats?.todaySignupsChange}
          icon={<IconUserPlus size={20} />}
          iconColor="violet"
          description="신규 가입자"
          loading={loading}
        />
        <StatCard
          title="시스템 상태"
          value={stats?.systemStatus === "healthy" ? "정상" : stats?.systemStatus === "warning" ? "주의" : "오류"}
          icon={<IconServer size={20} />}
          iconColor={stats?.systemStatus === "healthy" ? "green" : stats?.systemStatus === "warning" ? "yellow" : "red"}
          description="전체 시스템"
          loading={loading}
        />
      </SimpleGrid>

      {/* 서버 상태 */}
      <Paper
        p="md"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Text fw={600} c="white" mb="md">
          서버 상태
        </Text>
        <Stack gap="sm">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Box
                key={i}
                h={60}
                bg="dark.6"
                style={{ borderRadius: 8, animation: "pulse 1.5s infinite" }}
              />
            ))
          ) : (
            servers.map((server) => (
              <ServerStatusCard key={server.name} server={server} />
            ))
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}

function ServerStatusCard({ server }: { server: ServerStatus }) {
  return (
    <Paper p="sm" radius="sm" bg="dark.6">
      <Group justify="space-between" mb="xs">
        <Group gap="sm">
          <Text size="sm" fw={500} c="white">
            {server.name}
          </Text>
          <ServerStatusBadge status={server.status} size="xs" />
        </Group>
        {server.responseTime && (
          <Text size="xs" c="dimmed">
            {server.responseTime}ms
          </Text>
        )}
      </Group>

      <Group gap="lg">
        {server.cpu !== undefined && (
          <Box flex={1}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">CPU</Text>
              <Text size="xs" c="dimmed">{server.cpu}%</Text>
            </Group>
            <Progress
              value={server.cpu}
              size="xs"
              color={server.cpu > 80 ? "red" : server.cpu > 60 ? "yellow" : "green"}
            />
          </Box>
        )}
        {server.memory !== undefined && (
          <Box flex={1}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Memory</Text>
              <Text size="xs" c="dimmed">{server.memory}%</Text>
            </Group>
            <Progress
              value={server.memory}
              size="xs"
              color={server.memory > 80 ? "red" : server.memory > 60 ? "yellow" : "blue"}
            />
          </Box>
        )}
        {server.storage !== undefined && (
          <Box flex={1}>
            <Group justify="space-between" mb={4}>
              <Text size="xs" c="dimmed">Storage</Text>
              <Text size="xs" c="dimmed">{server.storage}%</Text>
            </Group>
            <Progress
              value={server.storage}
              size="xs"
              color={server.storage > 80 ? "red" : server.storage > 60 ? "yellow" : "cyan"}
            />
          </Box>
        )}
        {server.connections !== undefined && (
          <Box>
            <Text size="xs" c="dimmed">Connections</Text>
            <Text size="sm" c="white" fw={500}>{server.connections.toLocaleString()}</Text>
          </Box>
        )}
      </Group>
    </Paper>
  );
}


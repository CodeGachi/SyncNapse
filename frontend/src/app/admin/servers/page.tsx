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
  Badge,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconServer,
  IconDatabase,
  IconCloud,
  IconBrain,
  IconRefresh,
  IconActivity,
} from "@tabler/icons-react";
import { ServerStatusBadge } from "@/components/admin/common";
import { mockServerStatus, mockDelay } from "@/lib/api/mock/admin.mock";
import type { ServerStatus } from "@/lib/api/types/admin.types";

const SERVER_ICONS: Record<string, React.ReactNode> = {
  "Main API Server": <IconServer size={24} />,
  "WebSocket Server": <IconActivity size={24} />,
  "Database (Primary)": <IconDatabase size={24} />,
  "Database (Replica)": <IconDatabase size={24} />,
  "Media Storage (S3)": <IconCloud size={24} />,
  "AI Processing Server": <IconBrain size={24} />,
};

/**
 * 서버 상태 페이지
 *
 * - 서버별 상태 모니터링
 * - CPU, 메모리, 스토리지, 연결 수 확인
 */
export default function AdminServersPage() {
  const [servers, setServers] = useState<ServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchServers = async () => {
    setLoading(true);
    try {
      await mockDelay(500);
      setServers(mockServerStatus);
      setLastRefresh(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  // 자동 새로고침 (30초)
  useEffect(() => {
    const interval = setInterval(fetchServers, 30000);
    return () => clearInterval(interval);
  }, []);

  const healthyCount = servers.filter((s) => s.status === "healthy").length;
  const warningCount = servers.filter((s) => s.status === "warning").length;
  const errorCount = servers.filter((s) => s.status === "error").length;

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2} c="white">
          서버 상태
        </Title>
        <Group gap="md">
          <Text size="xs" c="dimmed">
            마지막 업데이트: {lastRefresh.toLocaleTimeString("ko-KR")}
          </Text>
          <Tooltip label="새로고침">
            <ActionIcon variant="subtle" color="gray" onClick={fetchServers} loading={loading}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* 상태 요약 */}
      <Paper
        p="md"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Group gap="xl">
          <Group gap="xs">
            <Box w={12} h={12} bg="green" style={{ borderRadius: "50%" }} />
            <Text size="sm" c="white">
              정상: {healthyCount}
            </Text>
          </Group>
          <Group gap="xs">
            <Box w={12} h={12} bg="yellow" style={{ borderRadius: "50%" }} />
            <Text size="sm" c="white">
              주의: {warningCount}
            </Text>
          </Group>
          <Group gap="xs">
            <Box w={12} h={12} bg="red" style={{ borderRadius: "50%" }} />
            <Text size="sm" c="white">
              오류: {errorCount}
            </Text>
          </Group>
        </Group>
      </Paper>

      {/* 서버 카드 */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Paper
                key={i}
                p="lg"
                radius="md"
                bg="dark.7"
                h={250}
                style={{
                  border: "1px solid var(--mantine-color-dark-5)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))
          : servers.map((server) => (
              <ServerCard key={server.name} server={server} />
            ))}
      </SimpleGrid>
    </Stack>
  );
}

function ServerCard({ server }: { server: ServerStatus }) {
  const icon = SERVER_ICONS[server.name] || <IconServer size={24} />;

  return (
    <Paper
      p="lg"
      radius="md"
      bg="dark.7"
      style={{
        border: `1px solid var(--mantine-color-${
          server.status === "healthy"
            ? "dark-5"
            : server.status === "warning"
            ? "yellow-8"
            : "red-8"
        })`,
      }}
    >
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <Box c={server.status === "healthy" ? "blue" : server.status === "warning" ? "yellow" : "red"}>
            {icon}
          </Box>
          <Box>
            <Text size="sm" fw={600} c="white">
              {server.name}
            </Text>
            <Text size="xs" c="dimmed">
              응답 시간: {server.responseTime}ms
            </Text>
          </Box>
        </Group>
        <ServerStatusBadge status={server.status} size="sm" />
      </Group>

      <Stack gap="md">
        {server.cpu !== undefined && (
          <MetricBar
            label="CPU"
            value={server.cpu}
            color={getMetricColor(server.cpu)}
          />
        )}
        {server.memory !== undefined && (
          <MetricBar
            label="Memory"
            value={server.memory}
            color={getMetricColor(server.memory)}
          />
        )}
        {server.storage !== undefined && (
          <MetricBar
            label="Storage"
            value={server.storage}
            color={getMetricColor(server.storage)}
          />
        )}
        {server.connections !== undefined && (
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Connections</Text>
            <Badge variant="light" size="sm">
              {server.connections.toLocaleString()}
            </Badge>
          </Group>
        )}
      </Stack>

      <Text size="xs" c="dimmed" mt="md">
        마지막 확인: {formatTime(server.lastCheck)}
      </Text>
    </Paper>
  );
}

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <Box>
      <Group justify="space-between" mb={4}>
        <Text size="xs" c="dimmed">
          {label}
        </Text>
        <Text size="xs" c={color} fw={500}>
          {value}%
        </Text>
      </Group>
      <Progress value={value} size="sm" color={color} />
    </Box>
  );
}

function getMetricColor(value: number): string {
  if (value > 80) return "red";
  if (value > 60) return "yellow";
  return "green";
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

"use client";

import { useState } from "react";
import {
  Title,
  Paper,
  Text,
  Stack,
  Group,
  Switch,
  NumberInput,
  Button,
  Divider,
  Badge,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconRefresh,
} from "@tabler/icons-react";

/**
 * 시스템 설정 페이지
 *
 * - 일반 설정
 * - 보안 설정
 */
export default function AdminSettingsPage() {
  const [saving, setSaving] = useState(false);

  // 일반 설정
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maxUploadSize, setMaxUploadSize] = useState<number | string>(100);
  const [sessionTimeout, setSessionTimeout] = useState<number | string>(60);

  // 보안 설정
  const [requireEmailVerification, setRequireEmailVerification] = useState(true);
  const [maxLoginAttempts, setMaxLoginAttempts] = useState<number | string>(5);
  const [lockoutDuration, setLockoutDuration] = useState<number | string>(30);

  const handleSave = async () => {
    setSaving(true);
    // Mock save
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSaving(false);
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2} c="white">
          시스템 설정
        </Title>
        <Group gap="sm">
          <Button variant="subtle" leftSection={<IconRefresh size={16} />}>
            초기화
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            onClick={handleSave}
            loading={saving}
          >
            저장
          </Button>
        </Group>
      </Group>

      {/* 일반 설정 */}
      <Paper
        p="lg"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Text fw={600} c="white" mb="md">
          일반 설정
        </Text>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="white">
                유지보수 모드
              </Text>
              <Text size="xs" c="dimmed">
                활성화 시 관리자 외 접근이 제한됩니다
              </Text>
            </div>
            <Group gap="sm">
              {maintenanceMode && (
                <Badge color="yellow" variant="light">
                  활성화됨
                </Badge>
              )}
              <Switch
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.currentTarget.checked)}
                color="yellow"
              />
            </Group>
          </Group>

          <Divider />

          <Group grow>
            <NumberInput
              label="최대 업로드 크기 (MB)"
              description="파일 업로드 최대 크기"
              value={maxUploadSize}
              onChange={setMaxUploadSize}
              min={1}
              max={500}
            />
            <NumberInput
              label="세션 타임아웃 (분)"
              description="자동 로그아웃 시간"
              value={sessionTimeout}
              onChange={setSessionTimeout}
              min={5}
              max={1440}
            />
          </Group>
        </Stack>
      </Paper>

      {/* 보안 설정 */}
      <Paper
        p="lg"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Text fw={600} c="white" mb="md">
          보안 설정
        </Text>
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Text size="sm" c="white">
                이메일 인증 필수
              </Text>
              <Text size="xs" c="dimmed">
                가입 시 이메일 인증을 요구합니다
              </Text>
            </div>
            <Switch
              checked={requireEmailVerification}
              onChange={(e) => setRequireEmailVerification(e.currentTarget.checked)}
            />
          </Group>

          <Divider />

          <Group grow>
            <NumberInput
              label="최대 로그인 시도"
              description="계정 잠금 전 허용 횟수"
              value={maxLoginAttempts}
              onChange={setMaxLoginAttempts}
              min={3}
              max={10}
            />
            <NumberInput
              label="계정 잠금 시간 (분)"
              description="잠금 후 해제까지 대기 시간"
              value={lockoutDuration}
              onChange={setLockoutDuration}
              min={5}
              max={1440}
            />
          </Group>
        </Stack>
      </Paper>

      {/* 환경 정보 */}
      <Paper
        p="lg"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Text fw={600} c="white" mb="md">
          환경 정보
        </Text>
        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">버전</Text>
            <Badge variant="light">v1.0.0</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">환경</Text>
            <Badge color="yellow" variant="light">Development</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">API URL</Text>
            <Text size="sm" c="white">http://localhost:4000</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Mock 모드</Text>
            <Badge color="blue" variant="light">활성화</Badge>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}

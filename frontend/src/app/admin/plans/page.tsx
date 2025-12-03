"use client";

import { useEffect, useState } from "react";
import {
  Title,
  Paper,
  Text,
  Stack,
  Group,
  SimpleGrid,
  Button,
  ActionIcon,
  Menu,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Switch,
  Table,
  Badge,
  Box,
  Divider,
  ScrollArea,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconHistory,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { PlanStatusBadge, DeletePlanModal } from "@/components/admin/common";
import {
  mockPlans,
  mockPlanHistory,
  mockDelay,
} from "@/lib/mock/admin.mock";
import type { Plan, PlanFeature, PlanHistory, PlanStatus } from "@/lib/api/types/admin.types";

/**
 * 요금제 관리 페이지 (US 7.4)
 *
 * - 요금제 목록 조회
 * - 요금제 생성/수정/삭제
 * - 요금제 변경 이력
 */
export default function AdminPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [history, setHistory] = useState<PlanHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [editOpened, { open: openEdit, close: closeEdit }] = useDisclosure(false);
  const [deleteOpened, { open: openDelete, close: closeDelete }] = useDisclosure(false);
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);

  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // 폼 상태
  const [formData, setFormData] = useState<{
    name: string;
    description: string;
    monthlyPrice: number;
    yearlyPrice: number;
    status: PlanStatus;
    features: PlanFeature[];
  }>({
    name: "",
    description: "",
    monthlyPrice: 0,
    yearlyPrice: 0,
    status: "active",
    features: [],
  });

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true);
      try {
        await mockDelay(500);
        setPlans(mockPlans);
        setHistory(mockPlanHistory);
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  // 새 요금제 생성
  const handleCreatePlan = () => {
    setIsCreating(true);
    setSelectedPlan(null);
    setFormData({
      name: "",
      description: "",
      monthlyPrice: 0,
      yearlyPrice: 0,
      status: "active",
      features: [
        { key: "notes", name: "노트 생성", enabled: true, limit: 10, unit: "개" },
        { key: "storage", name: "저장 공간", enabled: true, limit: 1, unit: "GB" },
        { key: "collaboration", name: "실시간 협업", enabled: false },
        { key: "ai_assist", name: "AI 지원", enabled: false },
        { key: "export", name: "PDF 내보내기", enabled: false },
      ],
    });
    openEdit();
  };

  // 요금제 수정
  const handleEditPlan = (plan: Plan) => {
    setIsCreating(false);
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      monthlyPrice: plan.monthlyPrice,
      yearlyPrice: plan.yearlyPrice,
      status: plan.status,
      features: [...plan.features],
    });
    openEdit();
  };

  // 요금제 저장
  const handleSavePlan = async () => {
    setActionLoading(true);
    try {
      await mockDelay(500);

      if (isCreating) {
        const newPlan: Plan = {
          id: `plan-${Date.now()}`,
          ...formData,
          subscriberCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setPlans((prev) => [...prev, newPlan]);
      } else if (selectedPlan) {
        setPlans((prev) =>
          prev.map((p) =>
            p.id === selectedPlan.id
              ? { ...p, ...formData, updatedAt: new Date().toISOString() }
              : p
          )
        );
      }
      closeEdit();
    } finally {
      setActionLoading(false);
    }
  };

  // 요금제 삭제
  const handleDeletePlan = (plan: Plan) => {
    setSelectedPlan(plan);
    openDelete();
  };

  const confirmDelete = async () => {
    if (!selectedPlan) return;
    setActionLoading(true);
    try {
      await mockDelay(500);
      setPlans((prev) => prev.filter((p) => p.id !== selectedPlan.id));
      closeDelete();
    } finally {
      setActionLoading(false);
    }
  };

  // 변경 이력 보기
  const handleViewHistory = (plan: Plan) => {
    setSelectedPlan(plan);
    openHistory();
  };

  const planHistory = history.filter((h) => h.planId === selectedPlan?.id);

  // 기능 토글
  const toggleFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) =>
        i === index ? { ...f, enabled: !f.enabled } : f
      ),
    }));
  };

  // 기능 제한 변경
  const updateFeatureLimit = (index: number, limit: number | null) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.map((f, i) =>
        i === index ? { ...f, limit } : f
      ),
    }));
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2} c="white">
          요금제 관리
        </Title>
        <Button leftSection={<IconPlus size={16} />} onClick={handleCreatePlan}>
          새 요금제
        </Button>
      </Group>

      {/* 요금제 카드 */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Paper
                key={i}
                p="lg"
                radius="md"
                bg="dark.7"
                h={300}
                style={{
                  border: "1px solid var(--mantine-color-dark-5)",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))
          : plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onEdit={() => handleEditPlan(plan)}
                onDelete={() => handleDeletePlan(plan)}
                onViewHistory={() => handleViewHistory(plan)}
              />
            ))}
      </SimpleGrid>

      {/* 요금제 편집 모달 */}
      <Modal
        opened={editOpened}
        onClose={closeEdit}
        title={isCreating ? "새 요금제 생성" : "요금제 수정"}
        size="lg"
        styles={{
          header: { backgroundColor: "var(--mantine-color-dark-7)" },
          body: { backgroundColor: "var(--mantine-color-dark-7)" },
        }}
      >
        <Stack gap="md">
          <TextInput
            label="요금제 이름"
            placeholder="예: Basic"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          <Textarea
            label="설명"
            placeholder="요금제 설명..."
            value={formData.description}
            onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
            rows={2}
          />

          <Group grow>
            <NumberInput
              label="월 요금 (원)"
              value={formData.monthlyPrice}
              onChange={(val) => setFormData((prev) => ({ ...prev, monthlyPrice: Number(val) || 0 }))}
              min={0}
              thousandSeparator=","
            />
            <NumberInput
              label="연 요금 (원)"
              value={formData.yearlyPrice}
              onChange={(val) => setFormData((prev) => ({ ...prev, yearlyPrice: Number(val) || 0 }))}
              min={0}
              thousandSeparator=","
            />
          </Group>

          <Divider label="기능 설정" labelPosition="center" />

          <ScrollArea h={250}>
            <Stack gap="sm">
              {formData.features.map((feature, index) => (
                <Paper key={feature.key} p="sm" radius="sm" bg="dark.6">
                  <Group justify="space-between">
                    <Group gap="sm">
                      <Switch
                        checked={feature.enabled}
                        onChange={() => toggleFeature(index)}
                      />
                      <Text size="sm" c={feature.enabled ? "white" : "dimmed"}>
                        {feature.name}
                      </Text>
                    </Group>
                    {feature.enabled && feature.limit !== undefined && (
                      <Group gap="xs">
                        <NumberInput
                          value={feature.limit ?? ""}
                          onChange={(val) => updateFeatureLimit(index, val === "" ? null : Number(val))}
                          placeholder="무제한"
                          w={100}
                          size="xs"
                          min={0}
                        />
                        <Text size="xs" c="dimmed">
                          {feature.unit}
                        </Text>
                      </Group>
                    )}
                  </Group>
                </Paper>
              ))}
            </Stack>
          </ScrollArea>

          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeEdit}>
              취소
            </Button>
            <Button onClick={handleSavePlan} loading={actionLoading}>
              {isCreating ? "생성" : "저장"}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 삭제 확인 모달 */}
      <DeletePlanModal
        opened={deleteOpened}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        planName={selectedPlan?.name || ""}
        loading={actionLoading}
      />

      {/* 변경 이력 모달 */}
      <Modal
        opened={historyOpened}
        onClose={closeHistory}
        title={`${selectedPlan?.name} 변경 이력`}
        size="lg"
        styles={{
          header: { backgroundColor: "var(--mantine-color-dark-7)" },
          body: { backgroundColor: "var(--mantine-color-dark-7)" },
        }}
      >
        {planHistory.length === 0 ? (
          <Text c="dimmed" ta="center" py="lg">
            변경 이력이 없습니다.
          </Text>
        ) : (
          <Stack gap="md">
            {planHistory.map((item) => (
              <Paper key={item.id} p="sm" radius="sm" bg="dark.6">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500} c="white">
                    {item.changedByName}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {formatDate(item.createdAt)}
                  </Text>
                </Group>
                <Stack gap="xs">
                  {item.changes.map((change, i) => (
                    <Group key={i} gap="xs">
                      <Badge size="xs" variant="outline">
                        {change.field}
                      </Badge>
                      <Text size="xs" c="red" style={{ textDecoration: "line-through" }}>
                        {String(change.oldValue)}
                      </Text>
                      <Text size="xs" c="dimmed">→</Text>
                      <Text size="xs" c="green">
                        {String(change.newValue)}
                      </Text>
                    </Group>
                  ))}
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

function PlanCard({
  plan,
  onEdit,
  onDelete,
  onViewHistory,
}: {
  plan: Plan;
  onEdit: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
}) {
  return (
    <Paper
      p="lg"
      radius="md"
      bg="dark.7"
      style={{ border: "1px solid var(--mantine-color-dark-5)" }}
    >
      <Group justify="space-between" mb="md">
        <Box>
          <Group gap="xs">
            <Text size="lg" fw={600} c="white">
              {plan.name}
            </Text>
            <PlanStatusBadge status={plan.status} size="xs" />
          </Group>
          <Text size="xs" c="dimmed" mt={4}>
            {plan.subscriberCount.toLocaleString()}명 구독 중
          </Text>
        </Box>
        <Menu shadow="md" width={140} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item leftSection={<IconEdit size={16} />} onClick={onEdit}>
              수정
            </Menu.Item>
            <Menu.Item leftSection={<IconHistory size={16} />} onClick={onViewHistory}>
              변경 이력
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              leftSection={<IconTrash size={16} />}
              color="red"
              onClick={onDelete}
              disabled={plan.subscriberCount > 0}
            >
              삭제
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <Text size="sm" c="dimmed" lineClamp={2} mb="md">
        {plan.description}
      </Text>

      <Group gap="lg" mb="md">
        <Box>
          <Text size="xs" c="dimmed">월 요금</Text>
          <Text size="lg" fw={700} c="white">
            {plan.monthlyPrice === 0 ? "무료" : `${plan.monthlyPrice.toLocaleString()}원`}
          </Text>
        </Box>
        <Box>
          <Text size="xs" c="dimmed">연 요금</Text>
          <Text size="lg" fw={700} c="white">
            {plan.yearlyPrice === 0 ? "무료" : `${plan.yearlyPrice.toLocaleString()}원`}
          </Text>
        </Box>
      </Group>

      <Divider mb="sm" />

      <Stack gap={4}>
        {plan.features.slice(0, 5).map((feature) => (
          <Group key={feature.key} gap="xs">
            {feature.enabled ? (
              <IconCheck size={14} color="var(--mantine-color-green-5)" />
            ) : (
              <IconX size={14} color="var(--mantine-color-gray-6)" />
            )}
            <Text size="xs" c={feature.enabled ? "white" : "dimmed"}>
              {feature.name}
              {feature.enabled && feature.limit !== null && feature.limit !== undefined && (
                <Text span c="dimmed"> ({feature.limit}{feature.unit})</Text>
              )}
              {feature.enabled && feature.limit === null && (
                <Text span c="dimmed"> (무제한)</Text>
              )}
            </Text>
          </Group>
        ))}
        {plan.features.length > 5 && (
          <Text size="xs" c="dimmed">
            +{plan.features.length - 5}개 더 보기
          </Text>
        )}
      </Stack>
    </Paper>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Title,
  Paper,
  Text,
  Stack,
  Group,
  TextInput,
  Select,
  Table,
  ActionIcon,
  Menu,
  Pagination,
  Box,
  Modal,
  Badge,
  Textarea,
  Button,
  NumberInput,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconSearch,
  IconDotsVertical,
  IconEye,
  IconBan,
  IconClock,
  IconCheck,
  IconAlertTriangle,
} from "@tabler/icons-react";
import {
  UserStatusBadge,
  RoleBadge,
  ConfirmModal,
} from "@/components/admin/common";
import {
  mockUsers,
  mockUserDetail,
  mockDelay,
  filterUsers,
  paginateData,
} from "@/lib/mock/admin.mock";
import type { AdminUser, AdminUserDetail, UserRole, UserStatus } from "@/lib/api/types/admin.types";

const PAGE_SIZE = 10;

/**
 * 사용자 관리 페이지 (US 7.1)
 *
 * - 사용자 목록 조회
 * - 검색 및 필터링
 * - 사용자 상태 변경 (정지, 차단, 활성화)
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // 필터
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  // 모달 상태
  const [detailOpened, { open: openDetail, close: closeDetail }] = useDisclosure(false);
  const [suspendOpened, { open: openSuspend, close: closeSuspend }] = useDisclosure(false);
  const [banOpened, { open: openBan, close: closeBan }] = useDisclosure(false);
  const [activateOpened, { open: openActivate, close: closeActivate }] = useDisclosure(false);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userDetail, setUserDetail] = useState<AdminUserDetail | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 정지 옵션
  const [suspendDays, setSuspendDays] = useState<number | string>(7);
  const [suspendReason, setSuspendReason] = useState("");
  const [banReason, setBanReason] = useState("");

  useEffect(() => {
    async function fetchUsers() {
      setLoading(true);
      try {
        await mockDelay(500);
        setUsers(mockUsers);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // 필터링된 사용자
  const filteredUsers = useMemo(() => {
    return filterUsers(users, {
      role: roleFilter || undefined,
      status: statusFilter || undefined,
      search: search || undefined,
    });
  }, [users, roleFilter, statusFilter, search]);

  // 페이지네이션
  const { data: paginatedUsers, total, totalPages } = useMemo(() => {
    return paginateData(filteredUsers, page, PAGE_SIZE);
  }, [filteredUsers, page]);

  // 사용자 상세 보기
  const handleViewUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setUserDetail(null);
    openDetail();

    await mockDelay(300);
    setUserDetail({ ...mockUserDetail, ...user });
  };

  // 사용자 정지
  const handleSuspendUser = (user: AdminUser) => {
    setSelectedUser(user);
    setSuspendDays(7);
    setSuspendReason("");
    openSuspend();
  };

  const confirmSuspend = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await mockDelay(500);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? {
                ...u,
                status: "suspended" as UserStatus,
                suspendedUntil: new Date(
                  Date.now() + Number(suspendDays) * 24 * 60 * 60 * 1000
                ).toISOString(),
              }
            : u
        )
      );
      closeSuspend();
    } finally {
      setActionLoading(false);
    }
  };

  // 사용자 차단
  const handleBanUser = (user: AdminUser) => {
    setSelectedUser(user);
    setBanReason("");
    openBan();
  };

  const confirmBan = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await mockDelay(500);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, status: "banned" as UserStatus, banReason }
            : u
        )
      );
      closeBan();
    } finally {
      setActionLoading(false);
    }
  };

  // 사용자 활성화
  const handleActivateUser = (user: AdminUser) => {
    setSelectedUser(user);
    openActivate();
  };

  const confirmActivate = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await mockDelay(500);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, status: "active" as UserStatus, suspendedUntil: undefined, banReason: undefined }
            : u
        )
      );
      closeActivate();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      <Title order={2} c="white">
        사용자 관리
      </Title>

      {/* 필터 영역 */}
      <Paper
        p="md"
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)" }}
      >
        <Group gap="md">
          <TextInput
            placeholder="이름 또는 이메일 검색..."
            leftSection={<IconSearch size={16} />}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{ flex: 1, maxWidth: 300 }}
          />
          <Select
            placeholder="역할"
            data={[
              { value: "admin", label: "관리자" },
              { value: "operator", label: "운영자" },
              { value: "user", label: "사용자" },
            ]}
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            clearable
            w={130}
          />
          <Select
            placeholder="상태"
            data={[
              { value: "active", label: "활성" },
              { value: "inactive", label: "비활성" },
              { value: "suspended", label: "정지" },
              { value: "banned", label: "차단" },
            ]}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            clearable
            w={130}
          />
          <Text size="sm" c="dimmed">
            총 {total}명
          </Text>
        </Group>
      </Paper>

      {/* 사용자 테이블 */}
      <Paper
        radius="md"
        bg="dark.7"
        style={{ border: "1px solid var(--mantine-color-dark-5)", overflow: "hidden" }}
      >
        <Table.ScrollContainer minWidth={800}>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>사용자</Table.Th>
                <Table.Th>역할</Table.Th>
                <Table.Th>상태</Table.Th>
                <Table.Th>구독</Table.Th>
                <Table.Th>가입일</Table.Th>
                <Table.Th>마지막 로그인</Table.Th>
                <Table.Th w={60}></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Table.Tr key={i}>
                    <Table.Td colSpan={7}>
                      <Box
                        h={40}
                        bg="dark.6"
                        style={{ borderRadius: 4, animation: "pulse 1.5s infinite" }}
                      />
                    </Table.Td>
                  </Table.Tr>
                ))
              ) : paginatedUsers.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={7}>
                    <Text c="dimmed" ta="center" py="lg">
                      검색 결과가 없습니다.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                paginatedUsers.map((user) => (
                  <Table.Tr key={user.id}>
                    <Table.Td>
                      <Box>
                        <Text size="sm" fw={500}>
                          {user.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {user.email}
                        </Text>
                      </Box>
                    </Table.Td>
                    <Table.Td>
                      <RoleBadge role={user.role} size="sm" />
                    </Table.Td>
                    <Table.Td>
                      <UserStatusBadge status={user.status} size="sm" />
                    </Table.Td>
                    <Table.Td>
                      {user.subscription ? (
                        <Badge variant="outline" size="sm">
                          {user.subscription.planName}
                        </Badge>
                      ) : (
                        <Text size="sm" c="dimmed">
                          -
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(user.createdAt)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "-"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Menu shadow="md" width={160} position="bottom-end">
                        <Menu.Target>
                          <ActionIcon variant="subtle" color="gray">
                            <IconDotsVertical size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item
                            leftSection={<IconEye size={16} />}
                            onClick={() => handleViewUser(user)}
                          >
                            상세 보기
                          </Menu.Item>
                          {user.status !== "active" && (
                            <Menu.Item
                              leftSection={<IconCheck size={16} />}
                              color="green"
                              onClick={() => handleActivateUser(user)}
                            >
                              활성화
                            </Menu.Item>
                          )}
                          {user.status === "active" && user.role === "user" && (
                            <>
                              <Menu.Item
                                leftSection={<IconClock size={16} />}
                                color="yellow"
                                onClick={() => handleSuspendUser(user)}
                              >
                                정지
                              </Menu.Item>
                              <Menu.Item
                                leftSection={<IconBan size={16} />}
                                color="red"
                                onClick={() => handleBanUser(user)}
                              >
                                영구 차단
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <Group justify="center" p="md" style={{ borderTop: "1px solid var(--mantine-color-dark-5)" }}>
            <Pagination
              total={totalPages}
              value={page}
              onChange={setPage}
              size="sm"
            />
          </Group>
        )}
      </Paper>

      {/* 사용자 상세 모달 */}
      <Modal
        opened={detailOpened}
        onClose={closeDetail}
        title="사용자 상세 정보"
        size="lg"
        styles={{
          header: { backgroundColor: "var(--mantine-color-dark-7)" },
          body: { backgroundColor: "var(--mantine-color-dark-7)" },
        }}
      >
        {selectedUser && (
          <UserDetailContent user={selectedUser} detail={userDetail} />
        )}
      </Modal>

      {/* 정지 모달 */}
      <Modal
        opened={suspendOpened}
        onClose={closeSuspend}
        title="사용자 정지"
        centered
        styles={{
          header: { backgroundColor: "var(--mantine-color-dark-7)" },
          body: { backgroundColor: "var(--mantine-color-dark-7)" },
        }}
      >
        <Stack gap="md">
          <Group gap="md" align="flex-start">
            <IconAlertTriangle size={24} color="var(--mantine-color-yellow-5)" />
            <Text size="sm" c="dimmed">
              &apos;{selectedUser?.name}&apos; 사용자를 정지하시겠습니까?
            </Text>
          </Group>
          <NumberInput
            label="정지 기간 (일)"
            value={suspendDays}
            onChange={setSuspendDays}
            min={1}
            max={365}
          />
          <Textarea
            label="정지 사유"
            placeholder="정지 사유를 입력하세요..."
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeSuspend}>
              취소
            </Button>
            <Button color="yellow" onClick={confirmSuspend} loading={actionLoading}>
              정지
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 차단 모달 */}
      <Modal
        opened={banOpened}
        onClose={closeBan}
        title="사용자 영구 차단"
        centered
        styles={{
          header: { backgroundColor: "var(--mantine-color-dark-7)" },
          body: { backgroundColor: "var(--mantine-color-dark-7)" },
        }}
      >
        <Stack gap="md">
          <Group gap="md" align="flex-start">
            <IconAlertTriangle size={24} color="var(--mantine-color-red-5)" />
            <Text size="sm" c="dimmed">
              &apos;{selectedUser?.name}&apos; 사용자를 영구 차단하시겠습니까?
              <br />
              차단된 사용자는 서비스를 이용할 수 없습니다.
            </Text>
          </Group>
          <Textarea
            label="차단 사유 (필수)"
            placeholder="차단 사유를 입력하세요..."
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            rows={3}
            required
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="subtle" color="gray" onClick={closeBan}>
              취소
            </Button>
            <Button
              color="red"
              onClick={confirmBan}
              loading={actionLoading}
              disabled={!banReason.trim()}
            >
              영구 차단
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 활성화 확인 모달 */}
      <ConfirmModal
        opened={activateOpened}
        onClose={closeActivate}
        onConfirm={confirmActivate}
        title="사용자 활성화"
        message={`'${selectedUser?.name}' 사용자를 활성화하시겠습니까? 활성화된 사용자는 정상적으로 서비스를 이용할 수 있습니다.`}
        confirmText="활성화"
        loading={actionLoading}
      />
    </Stack>
  );
}

function UserDetailContent({
  user,
  detail,
}: {
  user: AdminUser;
  detail: AdminUserDetail | null;
}) {
  return (
    <Stack gap="md">
      {/* 기본 정보 */}
      <Box>
        <Text size="lg" fw={600} c="white">
          {user.name}
        </Text>
        <Text size="sm" c="dimmed">
          {user.email}
        </Text>
        <Group gap="xs" mt="xs">
          <RoleBadge role={user.role} />
          <UserStatusBadge status={user.status} />
        </Group>
      </Box>

      {/* 상태 정보 */}
      {user.status === "suspended" && user.suspendedUntil && (
        <Paper p="sm" radius="sm" bg="yellow.9" style={{ opacity: 0.9 }}>
          <Text size="sm" c="yellow.1">
            정지 해제일: {formatDate(user.suspendedUntil)}
          </Text>
        </Paper>
      )}
      {user.status === "banned" && user.banReason && (
        <Paper p="sm" radius="sm" bg="red.9" style={{ opacity: 0.9 }}>
          <Text size="sm" c="red.1">
            차단 사유: {user.banReason}
          </Text>
        </Paper>
      )}

      {/* 통계 */}
      {detail?.stats && (
        <Paper p="md" radius="sm" bg="dark.6">
          <Text size="sm" fw={500} c="white" mb="sm">
            사용 통계
          </Text>
          <Group gap="xl">
            <Box>
              <Text size="xs" c="dimmed">노트 수</Text>
              <Text size="lg" fw={600} c="white">{detail.stats.notesCount}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">세션 참여</Text>
              <Text size="lg" fw={600} c="white">{detail.stats.sessionsCount}</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">이용 시간</Text>
              <Text size="lg" fw={600} c="white">{detail.stats.totalUsageHours.toFixed(1)}h</Text>
            </Box>
            <Box>
              <Text size="xs" c="dimmed">저장 공간</Text>
              <Text size="lg" fw={600} c="white">{(detail.stats.storageUsedMb / 1024).toFixed(1)}GB</Text>
            </Box>
          </Group>
        </Paper>
      )}

      {/* 구독 정보 */}
      {user.subscription && (
        <Paper p="md" radius="sm" bg="dark.6">
          <Text size="sm" fw={500} c="white" mb="sm">
            구독 정보
          </Text>
          <Group gap="md">
            <Badge size="lg">{user.subscription.planName}</Badge>
            <Badge
              color={
                user.subscription.status === "active"
                  ? "green"
                  : user.subscription.status === "past_due"
                  ? "red"
                  : "gray"
              }
              variant="light"
            >
              {user.subscription.status === "active"
                ? "활성"
                : user.subscription.status === "past_due"
                ? "연체"
                : "취소됨"}
            </Badge>
          </Group>
        </Paper>
      )}

      {/* 날짜 정보 */}
      <Paper p="md" radius="sm" bg="dark.6">
        <Group gap="xl">
          <Box>
            <Text size="xs" c="dimmed">가입일</Text>
            <Text size="sm" c="white">{formatDate(user.createdAt)}</Text>
          </Box>
          <Box>
            <Text size="xs" c="dimmed">마지막 로그인</Text>
            <Text size="sm" c="white">
              {user.lastLoginAt ? formatDate(user.lastLoginAt) : "-"}
            </Text>
          </Box>
        </Group>
      </Paper>
    </Stack>
  );
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

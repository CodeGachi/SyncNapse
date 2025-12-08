"use client";

import { Modal, Text, Group, Button, Stack } from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";

interface ConfirmModalProps {
  /** 모달 열림 상태 */
  opened: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
  /** 확인 핸들러 */
  onConfirm: () => void;
  /** 모달 제목 */
  title: string;
  /** 모달 내용 */
  message: string;
  /** 확인 버튼 텍스트 */
  confirmText?: string;
  /** 취소 버튼 텍스트 */
  cancelText?: string;
  /** 위험한 작업 여부 (빨간색 확인 버튼) */
  danger?: boolean;
  /** 로딩 상태 */
  loading?: boolean;
}

/**
 * 확인 모달 컴포넌트
 *
 * 위험한 작업(삭제, 차단 등) 전에 사용자 확인을 받을 때 사용
 */
export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "확인",
  cancelText = "취소",
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  const Icon = danger ? IconAlertTriangle : IconInfoCircle;
  const iconColor = danger ? "red" : "blue";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={title}
      centered
      size="sm"
      styles={{
        header: {
          backgroundColor: "var(--mantine-color-dark-7)",
        },
        body: {
          backgroundColor: "var(--mantine-color-dark-7)",
        },
      }}
    >
      <Stack gap="md">
        <Group gap="md" align="flex-start">
          <Icon
            size={24}
            color={`var(--mantine-color-${iconColor}-5)`}
            style={{ flexShrink: 0, marginTop: 2 }}
          />
          <Text size="sm" c="dimmed">
            {message}
          </Text>
        </Group>

        <Group justify="flex-end" gap="sm">
          <Button
            variant="subtle"
            color="gray"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            color={danger ? "red" : "blue"}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ============ 특화된 확인 모달들 ============

interface UserActionModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  loading?: boolean;
}

/**
 * 사용자 정지 확인 모달
 */
export function SuspendUserModal({
  opened,
  onClose,
  onConfirm,
  userName,
  loading,
}: UserActionModalProps) {
  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      title="사용자 정지"
      message={`'${userName}' 사용자를 정지하시겠습니까? 정지된 사용자는 서비스를 이용할 수 없습니다.`}
      confirmText="정지"
      danger
      loading={loading}
    />
  );
}

/**
 * 사용자 차단 확인 모달
 */
export function BanUserModal({
  opened,
  onClose,
  onConfirm,
  userName,
  loading,
}: UserActionModalProps) {
  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      title="사용자 차단"
      message={`'${userName}' 사용자를 영구 차단하시겠습니까? 차단된 사용자는 계정이 완전히 비활성화되며 복구가 어렵습니다.`}
      confirmText="영구 차단"
      danger
      loading={loading}
    />
  );
}

/**
 * 사용자 활성화 확인 모달
 */
export function ActivateUserModal({
  opened,
  onClose,
  onConfirm,
  userName,
  loading,
}: UserActionModalProps) {
  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      title="사용자 활성화"
      message={`'${userName}' 사용자를 활성화하시겠습니까? 활성화된 사용자는 정상적으로 서비스를 이용할 수 있습니다.`}
      confirmText="활성화"
      loading={loading}
    />
  );
}

/**
 * 요금제 삭제 확인 모달
 */
export function DeletePlanModal({
  opened,
  onClose,
  onConfirm,
  planName,
  loading,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  planName: string;
  loading?: boolean;
}) {
  return (
    <ConfirmModal
      opened={opened}
      onClose={onClose}
      onConfirm={onConfirm}
      title="요금제 삭제"
      message={`'${planName}' 요금제를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
      confirmText="삭제"
      danger
      loading={loading}
    />
  );
}

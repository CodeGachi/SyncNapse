"use client";

import { Badge, type BadgeProps } from "@mantine/core";
import type { UserStatus, PlanStatus } from "@/lib/api/types/admin.types";

// ============ 사용자 상태 뱃지 ============

interface UserStatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: UserStatus;
}

const userStatusConfig: Record<
  UserStatus,
  { label: string; color: string }
> = {
  active: { label: "활성", color: "green" },
  inactive: { label: "비활성", color: "gray" },
  suspended: { label: "정지", color: "yellow" },
  banned: { label: "차단", color: "red" },
};

export function UserStatusBadge({ status, ...props }: UserStatusBadgeProps) {
  const config = userStatusConfig[status];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}

// ============ 역할 뱃지 ============

interface RoleBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  role: "admin" | "operator" | "user";
}

const roleConfig: Record<
  "admin" | "operator" | "user",
  { label: string; color: string }
> = {
  admin: { label: "관리자", color: "red" },
  operator: { label: "운영자", color: "blue" },
  user: { label: "사용자", color: "gray" },
};

export function RoleBadge({ role, ...props }: RoleBadgeProps) {
  const config = roleConfig[role];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}

// ============ 요금제 상태 뱃지 ============

interface PlanStatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: PlanStatus;
}

const planStatusConfig: Record<
  PlanStatus,
  { label: string; color: string }
> = {
  active: { label: "활성", color: "green" },
  inactive: { label: "비활성", color: "gray" },
  deprecated: { label: "지원 종료", color: "red" },
};

export function PlanStatusBadge({ status, ...props }: PlanStatusBadgeProps) {
  const config = planStatusConfig[status];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}

// ============ 구독 상태 뱃지 ============

interface SubscriptionStatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: "active" | "cancelled" | "past_due";
}

const subscriptionStatusConfig: Record<
  "active" | "cancelled" | "past_due",
  { label: string; color: string }
> = {
  active: { label: "활성", color: "green" },
  cancelled: { label: "취소됨", color: "gray" },
  past_due: { label: "연체", color: "red" },
};

export function SubscriptionStatusBadge({
  status,
  ...props
}: SubscriptionStatusBadgeProps) {
  const config = subscriptionStatusConfig[status];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}

// ============ 서버 상태 뱃지 ============

interface ServerStatusBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  status: "healthy" | "warning" | "error";
}

const serverStatusConfig: Record<
  "healthy" | "warning" | "error",
  { label: string; color: string }
> = {
  healthy: { label: "정상", color: "green" },
  warning: { label: "주의", color: "yellow" },
  error: { label: "오류", color: "red" },
};

export function ServerStatusBadge({ status, ...props }: ServerStatusBadgeProps) {
  const config = serverStatusConfig[status];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}

// ============ 알림 타입 뱃지 ============

interface AlertTypeBadgeProps extends Omit<BadgeProps, "color" | "children"> {
  type: "info" | "warning" | "error";
}

const alertTypeConfig: Record<
  "info" | "warning" | "error",
  { label: string; color: string }
> = {
  info: { label: "정보", color: "blue" },
  warning: { label: "경고", color: "yellow" },
  error: { label: "오류", color: "red" },
};

export function AlertTypeBadge({ type, ...props }: AlertTypeBadgeProps) {
  const config = alertTypeConfig[type];
  return (
    <Badge color={config.color} variant="light" {...props}>
      {config.label}
    </Badge>
  );
}
